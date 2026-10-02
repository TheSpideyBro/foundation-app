# Database Schema

## Overview

- **Engine**: PostgreSQL via Supabase
- **RLS**: Enabled on all 9 tables
- **Auth Integration**: `auth.users()` for authentication, custom `users` table for roles
- **Full Schema File**: `supabase/schema.sql` — **generated from the live project**, do not edit by hand. Regenerate after any migration:

```bash
SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=mlnzxhuozuyidpxepxex \
  python3 scripts/dump-supabase-schema.py > supabase/schema.sql
```

- **Two deployments**: Main `mlnzxhuozuyidpxepxex`, Test `pvfdgrdvvoytsfmjyvde`. Same app, but the schemas have diverged (see [TD-011](../decisions/TECH_DEBT.md)); Test migrations live in `supabase/migrations-test/`.

## Tables

### users
Application-level user profiles linked to Supabase Auth.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | References auth.users(id) ON DELETE CASCADE |
| email | TEXT | UNIQUE |
| role | TEXT | CHECK IN ('admin','treasurer','member'), DEFAULT 'member' |
| name | TEXT | Bengali display name |
| phone | TEXT | |
| is_approved | BOOLEAN NOT NULL | DEFAULT false (DB-010) |
| member_id | UUID FK | → members(id) ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | |

### members
Foundation members who pay monthly pledges.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| member_code | TEXT | Excel-based member ID (1-44), unique, nullable |
| name | TEXT | Bengali name |
| phone | TEXT | |
| address | TEXT | |
| monthly_pledge | NUMERIC NOT NULL | DEFAULT 0, CHECK ≥ 0 (DB-010) |
| join_date | DATE | DEFAULT CURRENT_DATE |
| status | TEXT | CHECK IN ('active','inactive') |
| created_at | TIMESTAMPTZ | |

Self-service updates are limited to `name` / `address` / `phone` by the
`trg_member_self_update` trigger (BUG-018); the link to `users` is
`users.member_id` (Test also carries a legacy `members.user_id`).

### donations
Payment records from members.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| member_id | UUID FK | → members(id) ON DELETE CASCADE |
| amount | NUMERIC NOT NULL | CHECK > 0 |
| date | DATE | DEFAULT CURRENT_DATE |
| method | TEXT | CHECK IN ('cash','bkash','nagad','bank') |
| receipt_no | TEXT UNIQUE | `set_receipt_no` trigger → `generate_receipt_no()` |
| donation_month / donation_end_month | TEXT | legacy single/dual month label |
| coverage_start_month / coverage_end_month | TEXT | multi-month coverage window (YYYY-MM) |
| extra_amount | NUMERIC NOT NULL | DEFAULT 0, CHECK ≥ 0 (Main only — absent on Test) |
| note | TEXT | |
| collected_by | UUID FK | → users(id) |
| created_by | UUID FK | → users(id) |
| batch_id | UUID | Groups multi-month donations |
| created_at | TIMESTAMPTZ | |

Indexes: `idx_donations_member_id`, `idx_donations_member_date`, `idx_donations_date`,
`idx_donations_collected_by`, `idx_donations_created_by`, `idx_donations_batch_id`.

### payment_allocations ★ Source of Truth
How each donation is split across months (ADR-002).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| payment_id | UUID FK | → donations(id) ON DELETE CASCADE |
| member_id | UUID FK | → members(id) ON DELETE CASCADE |
| month | TEXT | YYYY-MM for pledge allocations, NULL for unallocated |
| amount | NUMERIC | CHECK ≥ 0 |
| allocation_type | TEXT | CHECK IN ('pledge','advance','unallocated') |
| note | TEXT | |
| created_by | UUID FK | |
| created_at | TIMESTAMPTZ | |

UNIQUE `(payment_id, month, allocation_type)` → `uq_payment_allocations_payment_month_type`;
indexes on `(payment_id)`, `(member_id, month)`, `(month)`.

**Invariant:** `SUM(payment_allocations.amount) = SUM(donations.amount)` (zero-sum, asserted by
`20260929_backfill_legacy_donations.sql`).

### member_pledge_history
Tracks pledge amount changes over time.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| member_id | UUID FK | → members(id) ON DELETE CASCADE |
| monthly_amount | NUMERIC | CHECK ≥ 0 |
| effective_from_month | TEXT | CHECK `YYYY-MM` format |
| note | TEXT | |
| created_by | UUID FK | |
| created_at | TIMESTAMPTZ | |

**Resolution rule (ADR-001):** for month `M`, the latest row with `effective_from_month <= M`
wins → otherwise `members.monthly_pledge` (the fallback) → otherwise `0`. `members.monthly_pledge`
must agree with the newest effective row, or every "current pledge" label disagrees with the
ledger (BUG-031, fixed by `20261001_pledge_history_akash_october.sql`).

### expenses
Foundation expenditures: `id`, `category`, `amount` (CHECK > 0), `date`, `description`,
`proof_url`, `created_by` FK, `created_at`. Index `idx_expenses_created_by`.

### notices
Foundation announcements: `id`, `title`, `content`, `is_active`, `created_by` FK, `created_at`.
SELECT policy `notices_select_all` (any role); writes admin-only.

### expense_categories
`id`, `name` (UNIQUE), `is_default`, `created_at`. Admin-only writes, staff SELECT.

### audit_log
Written **only by database triggers** (`log_audit_event()` on `donations`, `expenses`,
`members` — and `payment_allocations` on Test).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | DEFAULT gen_random_uuid() |
| actor_id | UUID, nullable | `auth.uid()`; NULL for system/service-role writes (2026-10-02) |
| actor_email | TEXT | from the JWT, else `system@foundation.app` |
| action | TEXT | INSERT / UPDATE / DELETE |
| target_table | TEXT | |
| target_id | TEXT | |
| details | JSONB | DEFAULT '{}' — row image(s) |
| ip | TEXT | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

Admin-only SELECT (`audit_log_select_admin`); indexes on `actor_id` and `created_at`.

## Views

The six dashboard views run with **`security_invoker = true`** (since `20261002_review_v2_db_hardening.sql`),
so the base-table RLS policies apply to whoever queries them — owner-rights bypass was removed
because every authenticated user could read foundation-wide financials and every member's
`monthly_pledge` (review v2, H1). `anon` has **no SELECT** on any view (BUG-015);
`authenticated` and `service_role` do. Consequences: staff and service_role see full aggregates;
plain members see aggregates scoped to their own rows (expense views return a single zero row,
so `.single()` keeps working); the members directory shows a member only their own row.

- `member_summary`, `donation_summary`, `expense_summary`, `expense_category_summary`,
  `member_directory` — dashboard aggregates.
- `monthly_collection_summary` ★ — monthly target / collected / due / rate / expense /
  net balance. Reads **`payment_allocations`** (`allocated_totals`) plus a fallback
  (`legacy_totals`) for donations that have no allocation rows yet, and only counts
  `pledge`/`advance` rows with a concrete month inside the 11-month window.
- Test only: `audit_log_view` (flat projection of `audit_log`).

## SQL Functions

| Function | Executed by | Notes |
|----------|-------------|-------|
| `calculate_payment_allocation(p_payment_id, p_member_id, p_payment_amount, p_coverage_start, p_coverage_end, p_pledge_history)` | **service_role only** (authenticated revoked 2026-10-02 — it was a pledge-amount oracle) | Canonical allocation engine (SQL twin of `lib/payment-ledger.ts`, ADR-001). Returns `TABLE(month, amount, allocation_type)`. |
| `save_payment_entry(...)` | **service_role only** | 13 args on Main (incl. `p_extra_amount`), 12 on Test. Applies guards (positive amount, `YYYY-MM` coverage, span 1–120, pledge effective format/bound), then applies the pledge change to `members.monthly_pledge` **and** `member_pledge_history` **before** reading the history and inserting the donation + allocations (BUG-021/022/023). |
| `reallocate_payment(...)` | **service_role only** | 6 args on Main (persists extra + coverage), 5 on Test. Deletes and regenerates a payment's allocations with the same coverage guards; the pledge block also runs before the history read (BUG-021). |
| `backfill_payment_allocations()` | **service_role only** | Regenerates allocations for every donation that has none. Restored to Main by `20260929_backfill_legacy_donations.sql`. |
| `generate_receipt_no()` | authenticated, service_role (anon revoked 2026-10-02) | Advisory lock + no `lpad` truncation (BUG-017). Reachable only via the `set_receipt_no` trigger on staff donations INSERT. |
| `admin_delete_user(target_user_id)` | authenticated, service_role | Internal `get_my_role() = 'admin'` check is the authorization boundary (the founder-email bypass was deleted 2026-10-02); refuses self-delete. `authenticated` keeps EXECUTE because the admin API route calls it via the cookie-scoped user client. |
| `handle_new_user()` | trigger (auth.users) | Always inserts `role='member'`, `is_approved=false` — ignores client metadata (BUG-012). |
| `enforce_member_self_update()` | trigger (members) | BUG-018 column guard. |
| `log_audit_event()` | triggers | Zero-argument trigger function. |
| `set_receipt_no()`, `set_donation_month()` | triggers | Defaults on `donations`. |
| `get_my_role()`, `get_my_member_id()`, `get_my_is_approved()` | RLS helpers | `SECURITY DEFINER`, read `public.users`. The `anon` EXECUTE grant is load-bearing: RLS policies are `TO PUBLIC` and call these on every evaluation, so revoking it would turn anon queries into permission errors. |

> There is **no** `log_audit_event(p_action, ...)` RPC and no `delete_user(...)` — older docs
> described both; the live signatures are the ones in the table above.

## Migration History

| # | File | Date | Description |
|---|------|------|-------------|
| 1 | `20260828_harden_rls_and_integrity.sql` | 2026-08-28 | Initial RLS hardening, constraints, triggers |
| 2 | `20260830_add_admin_delete_user_rpc.sql` | 2026-08-30 | Admin user deletion via secure RPC |
| 3 | `20260901_dashboard_summary_views.sql` | 2026-09-01 | Dashboard summary views (member/donation/expense) |
| 4 | `20260902_donation_staff_permissions.sql` | 2026-09-02 | Staff donation CRUD permissions |
| 5 | `20260906_monthly_collection_summary_canonical_allocations.sql` | 2026-09-06 | First attempt at allocation-based summary view |
| 6 | `20260906_monthly_collection_summary_keep_empty_months.sql` | 2026-09-06 | Fix to preserve months with zero collections |
| 7 | `20260907_add_payment_allocations.sql` | 2026-09-07 | ★ payment_allocations table, allocation functions, RLS |
| 8 | `20260907_monthly_collection_summary_from_allocations.sql` | 2026-09-07 | Summary view reads payment_allocations — **applied to Main 2026-09-29 (BUG-020)** |
| 9 | `20260907_payment_allocations_member_pledge_fallback.sql` | 2026-09-07 | Fix: add member.monthly_pledge fallback to SQL engine |
| 10 | `20260908_extra_amount_and_receipt.sql` | 2026-09-08 | `extra_amount` column + receipt wording |
| 11 | `20260908_repair_payment_allocations_and_extra_amount.sql` | 2026-09-08 | Repair pass; this body is what Main ran (it dropped the pledge block — BUG-016) |
| 12 | `20260929_harden_handle_new_user_role.sql` | 2026-09-29 | BUG-012: signup can no longer set role/approval — **Main + Test** |
| 13 | `20260929_harden_definer_rpcs.sql` | 2026-09-29 | BUG-015/016/017/018: RPC revokes, pledge block, receipt lock, member guard, constraints, indexes — **Main** |
| 14 | `20260929_backfill_legacy_donations.sql` | 2026-09-29 | BUG-019: restore `backfill_payment_allocations()`, pin coverage, backfill, assert zero-sum — **Main** |
| 15 | `20260930_pledge_change_before_allocation.sql` | 2026-09-30 | BUG-021/022/023: pledge block moved before the history read + allocation in `save_payment_entry()`/`reallocate_payment()`, coverage span ≤120 months, pledge effective format/bound checks, zero-sum assertion — **Main + Test** |
| 16 | `20261001_pledge_history_akash_october.sql` | 2026-10-01 | BUG-031 (data): pledge row `2026-10 → ৳100` for member `a40ef6db` (Sep stays ৳1,000); asserts the resolution and `members.monthly_pledge`, no allocation touched — **Main** |
| 17 | `20261002_review_v2_db_hardening.sql` | 2026-10-02 | Review v2 DB fixes — **Main, APPLIED 2026-10-02 ~02:45 +06** via Management API (BEGIN; … COMMIT; + NOTIFY pgrst reload), all 5 premises re-verified against the live catalog at apply time, 10/10 post-apply checks green, `supabase/schema.sql` regenerated from live: C1 deletes the founder-email bypass in `admin_delete_user` (role table is sole authority); H1 sets `security_invoker = true` on the six summary views so RLS applies; M1 revokes `authenticated` EXECUTE on `calculate_payment_allocation` (pledge oracle → service_role only); M2 makes `audit_log.actor_id` nullable and stops misattributing system writes to a random admin; L6 revokes `anon` EXECUTE on `generate_receipt_no` |
| 18 | `20261002_audit_followup_hygiene.sql` | 2026-10-02 | Supabase audit follow-ups — **Main, APPLIED 2026-10-02 ~02:55 +06** via Management API (BEGIN; … COMMIT; + NOTIFY pgrst reload), premises re-verified live at apply time, post-apply checks green (incl. rolled-back INSERT proving triggers still fire), `supabase/schema.sql` regenerated: L-A1 revokes `PUBLIC`/`anon`/`authenticated` EXECUTE on the 5 trigger functions (postgres + service_role keep); L-A2 revokes meaningless INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER on the six views from `PUBLIC`/`anon`/`authenticated` (SELECT untouched); L-A3 pins `SET search_path = public` on `set_donation_month`/`set_receipt_no` (bodies byte-identical) |
| 19 | `20261003_review_v3_db_fixes.sql` | 2026-10-03 | Review v3 DB fixes (BUG-042/043) — **Main, APPLIED 2026-10-02 ~11:40 +06** via Management API (BEGIN; … COMMIT; + NOTIFY pgrst reload), both premises re-verified against the live catalog at apply time, post-apply checks green (protected-check-first body, trigger attached, zero-sum holds), `supabase/schema.sql` regenerated from live: S-M1 removes the early-return allowlist in `enforce_member_self_update` — protected fields (`monthly_pledge`/`status`/`join_date`/`created_at`) are checked first and raise 42501, service_role + admin/treasurer bypasses intact; S-M2 adds `UPDATE … SET created_by = NULL` for `member_pledge_history`, `payment_allocations`, `expenses`, `notices` in `admin_delete_user` before `DELETE FROM auth.users` |
| 20 | `20261002_member_portal_rls.sql` | 2026-10-02 | F1 member self-service portal ("আমার হিসাব") — **Main, APPLIED 2026-10-02 ~11:50 +06** via Management API (BEGIN; … COMMIT; + NOTIFY pgrst reload), premises re-verified live at apply time (neither policy existed), post-apply checks green, `supabase/schema.sql` regenerated: new `payment_allocations_select_own` + `pledge_history_select_own` SELECT policies (`member_id = get_my_member_id()`), additive to the staff policies — members can read only their own allocation/pledge-history rows so the portal builds its ledger with the canonical engine |
| 21 | `20261002_f3_notifications.sql` | 2026-10-02 | F3 automatic receipt delivery — **Main, APPLIED 2026-10-02 ~12:10 +06** via Management API (BEGIN; … COMMIT; + NOTIFY pgrst reload), premises re-verified live at apply time (table did not exist), post-apply checks green (table + 2 policies present, RLS enabled, zero-sum holds), `supabase/schema.sql` regenerated: new `notifications` log table (donation/member FKs, channel whatsapp/sms, recipient, status sent/failed/skipped, provider id, error, sent_by) + `notifications_select_staff` / `notifications_insert_staff` RLS policies |
| 22 | `20261002_f5_reminder_log.sql` | 2026-10-02 | F5 pledge reminders — **Main, APPLIED 2026-10-02 ~14:25 +06** via Management API (BEGIN; … COMMIT; + NOTIFY pgrst reload), premise re-verified live at apply time (table did not exist), post-apply checks green (table + 2 policies present, RLS enabled, 4 indexes, zero-sum holds), `supabase/schema.sql` regenerated: new `reminder_log` table (member FK → cascade delete, month YYYY-MM, channel whatsapp/sms, recipient, status sent/failed/skipped, error, sent_by NULL = automatic) + member/month/member+month indexes + `reminder_log_select_staff` / `reminder_log_insert_staff` RLS policies |
| — | `supabase/migrations-test/20260929_harden_test_project.sql` | 2026-09-29 | The same hardening for the **Test** project (different RPC signatures) |
| — | `supabase/migrations-test/20260930_pledge_change_before_allocation.sql` | 2026-09-30 | Row 15 for the **Test** project (12-arg `save_payment_entry`, no `extra_amount`) |

The `supabase_migrations.schema_migrations` ledger on Main stops at `20260907194636`, so it is
**not** a reliable record of what has been applied (see TD-011). Verify against the catalog
(`scripts/dump-supabase-schema.py`) rather than the ledger.
