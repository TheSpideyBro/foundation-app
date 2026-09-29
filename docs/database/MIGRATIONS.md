# Migration Guide

## How Migrations Work

This project uses manual SQL migration files in `supabase/migrations/`, written against the
**Main** project. The Test project gets its own files in `supabase/migrations-test/` because
its function signatures differ — replaying a Main file there would create duplicate
overloads (TD-011).

Migrations are applied through the Supabase Management API (the same path the audit used):

```bash
python3 /tmp/opencode/apply-sql.py supabase/migrations/<file>.sql
# POST https://api.supabase.com/v1/projects/<ref>/database/query
# Authorization: Bearer <SUPABASE_ACCESS_TOKEN>   body: {"query": "BEGIN;\n<file>\nCOMMIT;"}
```

If a whole-file batch is rejected with a statement-level error, apply it statement by
statement inside one transaction — every migration here is idempotent
(`CREATE OR REPLACE`, `IF NOT EXISTS`, `DO … EXCEPTION`), so a partial application is safe
to resume.

After applying: regenerate `supabase/schema.sql`
(`python3 scripts/dump-supabase-schema.py > supabase/schema.sql`) and re-run the audit
queries for the objects you touched.

## Naming Convention

```
YYYYMMDD_description_in_underscore_case.sql
```

Examples:
- `20260907_add_payment_allocations.sql`
- `20260907_payment_allocations_member_pledge_fallback.sql`

## Applying Migrations

### To the live projects

| Project | Ref | Use for |
|---------|-----|---------|
| **Daulkhar Foundation Main** (production) | `mlnzxhuozuyidpxepxex` | `supabase/migrations/*.sql` |
| **Daulkhar Foundation Test** | `pvfdgrdvvoytsfmjyvde` | `supabase/migrations-test/*.sql` |

```bash
SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=mlnzxhuozuyidpxepxex \
  python3 scripts/dump-supabase-schema.py > supabase/schema.sql   # inspect first
python3 /tmp/opencode/apply-sql.py supabase/migrations/<file>.sql
```

Never point a Main migration at Test or vice versa (different `save_payment_entry` /
`reallocate_payment` argument lists → broken overloads).

### To Local Development

Use the Supabase CLI:
```bash
supabase db reset  # Reset to fresh state
supabase migration up  # Apply pending migrations
```

## Creating a New Migration

1. Create a new file in `supabase/migrations/` with the naming convention above
2. Write the SQL (DDL for schema changes, DML for data changes)
3. Test on a branch or local Supabase first
4. Apply to the right project (`migrations/` → Main, `migrations-test/` → Test)
5. Update the migration history table in `docs/database/SCHEMA.md`
6. Regenerate `supabase/schema.sql` from the live catalog
7. Verify: `SELECT SUM(amount) FROM payment_allocations` = `SELECT SUM(amount) FROM donations`

## Migration Safety Rules

1. **Never drop columns** that the app code might still reference — add new columns first, deploy code, then drop old columns in a later migration
2. **Always use `IF EXISTS` / `IF NOT EXISTS`** for idempotent migrations where possible
3. **Notify PostgREST** after schema changes: `NOTIFY pgrst, 'reload schema';`
4. **Revoke elevated permissions** after creating functions: `REVOKE ALL ON FUNCTION ... FROM PUBLIC;` then grant the *minimum* role — read-only helpers to `authenticated`, anything that writes financial data to `service_role` only (see BUG-015). Never leave a `SECURITY DEFINER` write RPC executable by `anon`/`authenticated`.
5. **Test allocation invariant** after any migration affecting `payment_allocations` or `donations`: `SELECT SUM(amount) FROM payment_allocations` must equal `SELECT SUM(amount) FROM donations` — currently `7,850 = 7,850` on Main and `7,442 = 7,442` on Test
6. **Record the result**: the `supabase_migrations.schema_migrations` ledger is stale (stops at `20260907194636` on Main), so the catalog — not the ledger — is the record of what has been applied

## Common Patterns

### Adding a new table with RLS
```sql
CREATE TABLE public.new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns
);

ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "new_table_select" ON public.new_table
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "new_table_insert" ON public.new_table
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'treasurer'));

NOTIFY pgrst, 'reload schema';
```

### Adding a new SQL function
```sql
CREATE OR REPLACE FUNCTION public.my_function(p_param TEXT)
RETURNS TABLE (col TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- logic
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.my_function FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_function TO authenticated;

NOTIFY pgrst, 'reload schema';
```

### Adding a new column (safe pattern)
```sql
-- Step 1: Add column with default
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS new_field TEXT DEFAULT 'default_value';

-- Step 2: (After code deployment) Remove default if needed
-- ALTER TABLE public.members ALTER COLUMN new_field DROP DEFAULT;
```
