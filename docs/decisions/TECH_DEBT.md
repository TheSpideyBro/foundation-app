# Technical Debt

Every trade-off that will bite later is logged here. Format: `TD-###`.

**Status values:** `open` | `in-progress` | `resolved` | `mitigated`

---

## TD-001: Hardcoded Founder Email as Admin Bypass

**Status:** mitigated
**Region:** frontend

### Description

Was: 16 files inlined `user?.email === 'saddamakash234@gmail.com'` alongside `role === 'admin'`, so the literal was impossible to audit or rotate. Now every check goes through `isStaff()` / `isAdmin()` in `lib/auth.ts`, which read a single `FOUNDER_EMAIL` constant (`process.env.NEXT_PUBLIC_FOUNDER_EMAIL ?? "saddamakash234@gmail.com"`). The bypass itself is kept deliberately: it is the recovery path if the founder's `users.role` row is ever wrong, and it is auditable in one place. Remaining risk:
- Cannot be revoked from the database (it lives in code/env, not a role row).
- Bypasses the `users.role` model and RLS semantics.

### Why it exists
The founder's mail account predates role modeling and the hardcoded check was the fastest reliable fix; role resolution had gaps at the time (BUG-005). Kept intentionally as a recovery path, now in exactly one place.

### Recommended action
- Done: centralized helper (`lib/auth.ts`) — no component inlines an email.
- Still open: set the founder's `users.role = 'admin'` in the live DB, then decide whether the bypass is still needed; if not, drop `isFounder()` from `isAdmin`.

---

## TD-002: `ignoreBuildErrors: true` in next.config.ts

**Status:** resolved
**Region:** build

### Description

`next.config.ts` sets `ignoreBuildErrors: true` to pass type errors during build. This masks real regressions from CI and the build pipeline. `42370aa` introduced it to unblock a Vercel deployment.

### Why it exists
Deployment urgency; occasional legacy type issues that a clean-up pass has not completed.

### Resolution
`ignoreBuildErrors` removed from `next.config.ts`. The build now runs the full type check; `pnpm build` fails on a type error. Verified with a clean `pnpm lint` + `tsc --noEmit` + `pnpm build` run.

---

## TD-003: `get_my_role()` Runs Per RLS Check

**Status:** open
**Region:** database

### Description

RLS policies invoke `get_my_role()` which queries the `users` table on every row evaluation. In tables with many rows (donations, payment_allocations) this adds a per-row function call overhead. Acceptable at current scale (hundreds of rows), not at tens of thousands.

### Recommended action
- Monitor table sizes.
- If needed, add a `role` field on the auth session claims or cache `get_my_role()` result per query (`SET LOCAL` + temp table) — must keep policy semantics identical.

---

## TD-004: Receipt Generation is Canvas-Heavy

**Status:** open
**Region:** backend

### Description

The receipt route allocates a 800×1200 canvas per request and regenerates the entire image each time. Webhook-scale concurrency (many simultaneous `?download=1` requests) could exhaust memory in a serverless container.

### Recommended action
- Cache generated receipts keyed by donation id (e.g., Supabase Storage or a CDN).
- Increase concurrency limits with caution; add a per-process semaphore if needed.

---

## TD-005: WhatsApp Number-to-Words Converter Duplicated

**Status:** resolved
**Region:** app

### Description

The Bengali number-to-words converter exists in `lib/utils.ts` (`numberToWordsBengali`) AND is re-implemented inside the receipt route (`app/api/receipts/[id]/route.ts`). The receipt route can't import from `lib/utils.ts` cleanly because of bundling constraints, so the logic is duplicated.

### Resolution
The receipt route now imports `numberToWordsBengali` from `lib/utils.ts`; the local copy is deleted. That copy also had a real bug — `units[12]`/`units[hundred]` went out of range for values ≥ 10,000, printing `undefined হাজার` on receipts. Still missing: unit tests for lakh/crore edge cases.

---

## TD-006: Two Browser Supabase Client Implementations

**Status:** resolved
**Region:** app

### Description

`lib/supabase-client.ts` (getSupabase singleton with mock fallback) and `lib/supabase/client.ts` (createBrowserClient) both exist. Most pages import the former; a few import the latter. Minor divergence risk in client configuration.

### Resolution
`lib/supabase/client.ts` had zero importers and was deleted. `lib/supabase-client.ts` (`getSupabase` singleton with a loud mock fallback) is the only browser client; its writes now throw `SUPABASE_NOT_CONFIGURED` instead of silently no-oping.

---

## TD-007: Excel and PDF Export Implementations Overlap

**Status:** mitigated
**Region:** reports

### Description

Reports support export via both `xlsx` and `exceljs`, and PDF via `jsPDF`. Two spreadsheet libraries in the dependency tree serve overlapping purposes, increasing bundle size and maintenance surface.

### Resolution
`exceljs` was unused (no imports anywhere) and removed from `package.json`; `xlsx` (used by `/reports` and `/admin/bulk`) and `jsPDF` remain. Stale `package-lock.json` dropped — `pnpm-lock.yaml` is the single lockfile.
---

## TD-008: `supabase/schema.sql` Was Hand-Maintained and Drifted from Production

**Status:** resolved
**Region:** database

### Description

`schema.sql` was a hand-written DDL file that no longer matched the live project: it was missing `payment_allocations`, `coverage_start_month` / `coverage_end_month`, `extra_amount`, `note`, listed a `donations_delete_admin` policy where production has `donations_delete_staff`, and documented `members.user_id` (which exists only on the Test project — Main links via `users.member_id`). It could not be used to provision or review a database.

### Resolution

`scripts/dump-supabase-schema.py` regenerates the file from the live catalog (tables, constraints, FKs, indexes, RLS, verbatim policies, verbatim function bodies with their EXECUTE grants, triggers, views, grants):

```bash
SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=mlnzxhuozuyidpxepxex \
  python3 scripts/dump-supabase-schema.py > supabase/schema.sql
```

Read-only (SELECTs against `pg_catalog` / `information_schema`). Migrations remain the source of truth for *changes*; `schema.sql` is now a snapshot of what production runs, with a header saying so.

---

## TD-009: Missing Foreign-Key Indexes

**Status:** resolved
**Region:** database

### Description

Main had no index on `donations.member_id`, `donations.date`, `donations.collected_by`, `donations.created_by`, `expenses.created_by`, `users.member_id` or `audit_log.actor_id`; Test was missing the same set plus `member_pledge_history.created_by`. Every member-filtered donation lookup, every per-member report join and every audit-log-by-actor lookup did a sequential scan.

### Resolution

`idx_donations_member_id`, `idx_donations_date`, `idx_donations_collected_by`, `idx_donations_created_by`, `idx_expenses_created_by`, `idx_users_member_id`, `idx_audit_log_actor`, `idx_member_pledge_history_created_by` created on both projects (`IF NOT EXISTS`). Constraint-backed indexes were left alone.

---

## TD-010: `users.is_approved` and `members.monthly_pledge` Nullable, `users.role` Unchecked

**Status:** resolved
**Region:** database

### Description

`users.is_approved` and `members.monthly_pledge` were nullable (NULL meant "approved?" / "pledge?" could not be answered, and `isApproved()` had to treat NULL leniently), and `users.role` had no CHECK, so a typo'd role row would silently fail every `get_my_role() = 'admin'` comparison instead of erroring.

### Resolution

Both columns are now `NOT NULL DEFAULT false` / `NOT NULL DEFAULT 0`, and `users_role_valid CHECK (role IN ('member','treasurer','admin'))` is in place on both projects (no live row violated it — checked first). `isApproved()` in `lib/auth.ts` was tightened to `isApproved === true`, which the constraint now makes equivalent to the old `!== false`.

---

## TD-011: Two Deployments, One Codebase, Divergent Schemas

**Status:** open
**Region:** database

### Description

The app runs against two Supabase projects — **Main** `mlnzxhuozuyidpxepxex` and **Test** `pvfdgrdvvoytsfmjyvde` — and they are not schema-identical:

| | Main | Test |
|---|---|---|
| member↔user link | `users.member_id` | `users.member_id` **and** legacy `members.user_id` |
| `donations.extra_amount` | present | absent |
| `save_payment_entry` | 13 args (has `p_extra_amount`) | 12 args |
| `reallocate_payment` | 6 args (persists extra + coverage) | 5 args |
| views | 6 | 7 (extra `audit_log_view`) |
| duplicate CHECK constraints | no | yes (`donations_amount_check` + `donations_amount_positive`) |

This is why Test migrations live in `supabase/migrations-test/`: replaying a Main migration against Test (or vice versa) would create duplicate function **overloads** and break PostgREST with ambiguous RPC resolution.

Also unresolved: neither project's `supabase_migrations.schema_migrations` ledger matches `supabase/migrations/` (Main's newest recorded version is `20260907194636`), and several 2026-09-08 migrations were applied to Main without being recorded. Applying files in filename order against either project can therefore re-run work already done — every migration in this repo is written to be idempotent (`CREATE OR REPLACE`, `IF NOT EXISTS`, `DO ... EXCEPTION`) to compensate.

### Recommended action
1. Decide whether Test is disposable; if not, converge it onto Main's schema (drop `members.user_id`, add `extra_amount`, align the two RPC signatures).
2. Re-sync the migration ledger (`supabase_migrations.schema_migrations`) from the files that are actually applied, or adopt the Supabase CLI (`supabase db push`) so the ledger is maintained for you.
