#!/usr/bin/env python3
"""Regenerate supabase/schema.sql as executable DDL from the LIVE project.

The hand-maintained schema.sql had drifted from production (it was missing
payment_allocations, coverage_*_month, extra_amount and note, and carried the
wrong donations DELETE policy), so it could no longer be trusted to provision
or review a database. This rebuilds it from the catalog instead.

Read-only: every query is a SELECT against pg_catalog / information_schema.

Usage:
  SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=xxxxxxxx \\
    python3 scripts/dump-supabase-schema.py > supabase/schema.sql

Output is a provisioning script: run it against a fresh (empty) `public`
schema. Changes belong in supabase/migrations/, applied to the live project,
then this file is regenerated to match.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

Q = {
    "extensions": """
        SELECT extname FROM pg_extension
        WHERE extname IN ('uuid-ossp', 'pgcrypto') ORDER BY 1;
    """,
    "tables": """
        SELECT c.oid, c.relname
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname;
    """,
    "columns": """
        SELECT c.relname AS table_name, a.attname AS column_name,
               format_type(a.atttypid, a.atttypmod) AS type,
               a.attnotnull AS not_null,
               pg_get_expr(ad.adbin, ad.adrelid) AS default_expr
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND a.attnum > 0 AND NOT a.attisdropped
        ORDER BY c.relname, a.attnum;
    """,
    "constraints": """
        SELECT conrelid::regclass::text AS table_name, conname, contype,
               pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace AND contype IN ('p', 'u', 'c', 'f')
        ORDER BY conrelid::regclass::text,
                 CASE contype WHEN 'p' THEN 0 WHEN 'u' THEN 1 WHEN 'c' THEN 2 ELSE 3 END;
    """,
    "indexes": """
        SELECT i.tablename, i.indexname, i.indexdef
        FROM pg_indexes i
        WHERE i.schemaname = 'public'
          AND NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            WHERE c.conindid = (quote_ident(i.schemaname)||'.'||quote_ident(i.indexname))::regclass
          )
        ORDER BY 1, 2;
    """,
    "rls": """
        SELECT c.relname AS table_name, c.relrowsecurity AS enabled
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1;
    """,
    "policies": """
        SELECT tablename, policyname, cmd, roles::text AS roles,
               COALESCE(qual, '') AS using_expr, COALESCE(with_check, '') AS with_check_expr
        FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
    """,
    "functions": """
        SELECT pg_get_functiondef(p.oid) AS definition,
               p.proname,
               has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
               has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
               has_function_privilege('service_role', p.oid, 'EXECUTE') AS svc_exec
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' ORDER BY p.proname;
    """,
    "triggers": """
        SELECT tgrelid::regclass::text AS table_name, tgname,
               pg_get_triggerdef(oid) AS definition
        FROM pg_trigger
        WHERE NOT tgisinternal
          AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace)
        ORDER BY 1, 2;
    """,
    "views": """
        SELECT c.relname AS viewname, pg_get_viewdef(c.oid, true) AS body
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'v' ORDER BY 1;
    """,
    "grants": """
        SELECT table_name, privilege_type,
               string_agg(DISTINCT grantee, ', ' ORDER BY grantee) AS grantees
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND grantee IN ('anon', 'authenticated', 'service_role')
        GROUP BY 1, 2 ORDER BY 1, 2;
    """,
}


def query(token, ref, sql, label=""):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=json.dumps({"query": sql.strip()}).encode(),
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()[:400]
        raise SystemExit(f"catalog query failed ({label}): HTTP {exc.code}: {detail}")


def ident(name: str) -> str:
    if re.fullmatch(r"[a-z_][a-z0-9_]*", name):
        return name
    return '"' + name.replace('"', '""') + '"'


def split_pg_array(value):
    """Turn a PostgREST/pg array literal ('{public}') into a list of names."""
    if not value:
        return []
    value = value.strip()
    if value.startswith("{") and value.endswith("}"):
        inner = value[1:-1].strip()
        return [v.strip().strip('"') for v in inner.split(",")] if inner else []
    return [value]


def build(token, ref) -> str:
    data = {key: query(token, ref, sql, key) for key, sql in Q.items()}
    cols = {}
    for row in data["columns"]:
        cols.setdefault(row["table_name"], []).append(row)
    cons = {}
    for row in data["constraints"]:
        cons.setdefault(row["table_name"], []).append(row)

    out = [
        "-- Foundation Fund App - Supabase schema (GENERATED FROM LIVE)",
        f"-- Project: {ref}",
        "--",
        "-- Generated by scripts/dump-supabase-schema.py. DO NOT EDIT BY HAND:",
        "-- make changes in supabase/migrations/NNNNNN_description.sql, apply them",
        "-- to the live project, then regenerate with:",
        "--   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... \\",
        "--     python3 scripts/dump-supabase-schema.py > supabase/schema.sql",
        "--",
        "-- This file provisions an EMPTY public schema; it is a snapshot of",
        "-- what production runs, not an incremental migration.",
        "",
        "-- 1. Extensions",
    ]
    for row in data["extensions"]:
        out.append(f'CREATE EXTENSION IF NOT EXISTS "{row["extname"]}";')
    out += ["", "-- 2. Tables (columns + primary key / unique / check inline)", ""]

    for tbl in data["tables"]:
        name = tbl["relname"]
        lines = []
        for row in cons.get(name, []):
            if row["contype"] in ("p", "u", "c"):
                lines.append(f'    CONSTRAINT "{row["conname"]}" {row["definition"]}')
        for row in cols.get(name, []):
            piece = f"    {ident(row['column_name'])} {row['type']}"
            if row["default_expr"]:
                piece += f" DEFAULT {row['default_expr']}"
            if row["not_null"]:
                piece += " NOT NULL"
            lines.append(piece)
        out.append(f"CREATE TABLE IF NOT EXISTS public.{ident(name)} (")
        out.append(",\n".join(lines))
        out.append(");")
        out.append("")

    out.append("-- 3. Foreign keys (after all tables exist)")
    fks = 0
    for tbl_name, rows in cons.items():
        for row in rows:
            if row["contype"] == "f":
                out.append(f"ALTER TABLE public.{ident(tbl_name)} "
                           f"ADD CONSTRAINT \"{row['conname']}\" {row['definition']};")
                fks += 1
    if not fks:
        out.append("-- (none)")
    out.append("")

    out.append("-- 4. Indexes (constraint backing indexes omitted)")
    for row in data["indexes"]:
        out.append(row["indexdef"] + ";")
    out.append("")

    out.append("-- 5. Row Level Security")
    for row in data["rls"]:
        if row["enabled"]:
            out.append(f"ALTER TABLE public.{ident(row['table_name'])} ENABLE ROW LEVEL SECURITY;")
    out.append("")

    out.append("-- 6. Policies (verbatim from the live catalog)")
    for row in data["policies"]:
        roles = ", ".join("PUBLIC" if r == "public" else r for r in split_pg_array(row["roles"]))
        stmt = (f'CREATE POLICY "{row["policyname"]}" ON public.{ident(row["tablename"])}\n'
                f"  FOR {row['cmd']} TO {roles or 'PUBLIC'}")
        if row["using_expr"]:
            stmt += f"\n  USING ({row['using_expr']})"
        if row["with_check_expr"]:
            stmt += f"\n  WITH CHECK ({row['with_check_expr']})"
        out.append(stmt + ";")
    out.append("")

    out.append("-- 7. Functions (verbatim definitions; trailing line lists which roles")
    out.append("--    hold EXECUTE - only service_role may run the payment RPCs)")
    for row in data["functions"]:
        flags = []
        if row["anon_exec"]:
            flags.append("anon=EXECUTE")
        if row["auth_exec"]:
            flags.append("authenticated=EXECUTE")
        if row["svc_exec"]:
            flags.append("service_role=EXECUTE")
        out.append(f"-- {row['proname']}: " + (", ".join(flags) or "no client EXECUTE"))
        out.append(row["definition"].rstrip().rstrip(";") + ";")
        out.append("")

    out.append("-- 8. Triggers")
    for row in data["triggers"]:
        out.append(f"DROP TRIGGER IF EXISTS {row['tgname']} ON public.{ident(row['table_name'])};")
        out.append(row["definition"].rstrip().rstrip(";") + ";")
    out.append("")

    out.append("-- 9. Views")
    out.append("--    NOTE: no security_invoker is set, so views run with owner rights")
    out.append("--    (RLS on the base tables does NOT apply). anon has no SELECT on any")
    out.append("--    view - authenticated and service_role only.")
    for row in data["views"]:
        out.append(f"CREATE OR REPLACE VIEW public.{ident(row['viewname'])} AS")
        out.append(row["body"].rstrip().rstrip(";") + ";")
    out.append("")

    out.append("-- 10. Grants")
    out.append("--     Supabase's default grants are permissive for anon/authenticated:")
    out.append("--     RLS on the tables (section 5) is the real boundary for tables, and")
    out.append("--     EXECUTE (section 7) is the boundary for RPCs.")
    for row in data["grants"]:
        out.append(f"GRANT {row['privilege_type']} ON public.{ident(row['table_name'])} "
                   f"TO {row['grantees']};")
    out.append("")
    return "\n".join(out) + "\n"


def main() -> int:
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    ref = os.environ.get("SUPABASE_PROJECT_REF")
    if not token or not ref:
        print(__doc__)
        return 2
    text = build(token, ref)
    if len(sys.argv) > 1:
        with open(sys.argv[1], "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"wrote {sys.argv[1]} ({len(text.splitlines())} lines)")
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
