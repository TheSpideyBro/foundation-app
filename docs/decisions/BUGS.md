# Bug Tracking

Every bug encountered in this project is logged here. Format: `BUG-###`.

**Status values:** `fixed` | `open` | `known` | `by-design`

---

## BUG-001: SQL Allocation Engine Missing monthly_pledge Fallback

**Status:** fixed
**Found:** 2026-09-07
**Fixed:** 2026-09-07
**Region:** database

### Description

`calculate_payment_allocation()` resolved pledges ONLY from `member_pledge_history` JSONB. Members without a pledge-history entry had no fallback to `member.monthly_pledge`, so 37 of 40 donations were allocated as `unallocated` (month NULL), and the monthly collection summary showed `collected_amount = 0`.

### Root Cause

The SQL engine drifted from the TypeScript canonical engine (`resolvePledgeForMonth` in `lib/payment-ledger.ts`), which correctly falls back:
1. latest applicable pledge-history entry
2. → member `monthly_pledge`
3. → 0

### Fix

Migration `20260907_payment_allocations_member_pledge_fallback.sql` added the fallback to the SQL function:

```sql
(SELECT monthly_pledge::numeric FROM public.members WHERE id = p_member_id)
```

in the COALESCE chain. `save_payment_entry`, `reallocate_payment`, and `backfill_payment_allocations` all pass `p_member_id` through, so they inherited the corrected algorithm. Allocations were backfilled.

### Verification

`SUM(payment_allocations.amount) = SUM(donations.amount) = 7,442`, difference = 0.

### Preventative

ADRs [ADR-001](ADRs/ADR-001-canonical-payment-allocation.md) and [ADR-002](ADRs/ADR-002-payment-allocations-source-of-truth.md) codify the single canonical algorithm and the zero-sum invariant. Always touch TS + SQL together and re-run the 28-case test suite.

---

## BUG-002: Monthly Collection Summary Lost Empty Months

**Status:** fixed
**Found:** 2026-09-06
**Fixed:** 2026-09-06
**Region:** database

### Description

The `monthly_collection_summary` view only emitted months that had donations; months with zero collection were absent from the report, breaking the year/months axis for the dashboard.

### Root Cause

The view aggregated directly from `donations`, so months without rows vanished.

### Fix

Migration `20260906_monthly_collection_summary_keep_empty_months.sql` generated the full month series with `generate_series` and left-joined collection data.

### Preventative

The later rewrite (`20260907_monthly_collection_summary_from_allocations.sql`) kept this property.

---

## BUG-003: Receipt Collector Join Ambiguity

**Status:** fixed
**Found:** 2026-08
**Fixed:** 2026-08
**Region:** backend

### Description

Fetching the collector member name on the receipt raised a PostgREST relation ambiguity ("could not determine which relation..."): joining `donations.member_id` and `donations.received_by` to `members` left PostgREST unsure which FK to follow.

### Root Cause

Two FK relationships between `donations` and `members` (`member_id`, `received_by`).

### Fix

Explicit relationship alias using the correct join syntax (`received_by:members!received_by(...)`), commit `ca040ec`.

### Preventative

Use explicit FK aliases whenever a table has >1 FK to the same target.

---

## BUG-004: Donation Save Foreign Key — Lowercased Payment Method

**Status:** fixed
**Found:** 2026-08
**Fixed:** 2026-08
**Region:** backend

### Description

Payments saved with an uppercase method (e.g. "Bkash") failed FK/check validation; the fixed collector dropdown did not persist the correct collector ID.

### Root Cause

Method values were not normalizeed to lowercase before insert, and collector ID payload had the wrong key.

### Fix

Lowercase method on save and corrected payload (`7103657`, `668a7bc`). A redundant `user_id` on members was removed to stabilize member saving and linking (`fa85b81`).

---

## BUG-005: Admin Role Check Failed for Founder Email

**Status:** fixed
**Found:** 2026-08
**Fixed:** 2026-08
**Region:** frontend

### Description

Admin actions were hidden for `saddamakash234@gmail.com` because the role resolution returned member/no role in some components.

### Root Cause

Inconsistent role checks across components plus a hardcoded email fallback that wasn't applied everywhere.

### Fix

Added hardcoded admin email bypass everywhere admin UI is gated, plus role re-resolution improvements. See TD-001.

---

## BUG-006: Receipt Amount-in-Words Missing Variable

**Status:** fixed
**Found:** 2026-08
**Fixed:** 2026-08
**Region:** backend

### Description

Receipt generation threw `amountInWords is not defined`.

### Root Cause

The `amountInWords` variable was referenced in the template but not defined in that scope.

### Fix

Added the missing variable definition (`976917c`).

---

## BUG-007: Pledge History Not Reflected for Old Months

**Status:** fixed
**Found:** 2026-08
**Fixed:** 2026-08
**Region:** database/frontend

### Description

Pledge changes did not retroactively affect older months' expected amounts; effective-month tracking was missing on member updates.

### Root Cause

Member update path didn't record an effective date or pledge note; pledge changes could not be pinned to a month.

### Fix

Added `effective_from_month` and pledge notes to member updates (`2b0db7c`), moved pledge history to the admin control page (`c60c437`), and introduced `member_pledge_history` as the canonical per-month pledge source.

---

## BUG-008: Paid Member List Filtered by Wrong Month

**Status:** fixed
**Found:** 2026-08
**Fixed:** 2026-08
**Region:** frontend

### Description

The "paid members" report listed members by the month they were received, not the months their payments covered; advance payers appeared missing for months they actually covered. Multi-month payments also appeared twice.

### Root Cause

Report filtered `donations` by `date` only, ignoring `coverage_start_month`/`coverage_end_month` and advance allocations.

### Fix

Series of fixes: month picker (`c76650b`), advance-aware paid member list (`290b89e`), received-month inclusion (`35d9b1e`), covered-month filtering (`ab2c373`). Superseded by the `payment_allocations` rewrite (ADR-002), where the same question is answered from allocations.

---

## BUG-009: Receipt Share Text and UI Restrictions

**Status:** fixed
**Found:** 2026-08
**Fixed:** 2026-08
**Region:** frontend/backend

### Description

Receipt share text was misconfigured and UI restricted what staff could see on the donation page.

### Root Cause

Share text hardcoded the wrong wording; client permissions didn't allow all staff to download/share receipts.

### Fix

Refined share text and relaxed UI restrictions (`82bd748`).

---

## BUG-010: Audit Log Rendering Errors

**Status:** fixed
**Found:** 2026-08
**Fixed:** 2026-08
**Region:** frontend

### Description

Audit log page failed to render when audit entries contained unexpected/null detail structures.

### Root Cause

Unsafe access into JSONB `details` without guards.

### Fix

Safe rendering of audit log details (`01b88ea`), plus RLS policy fixes for the users table and nullable member `user_id` (`45564ba`).

---

## BUG-011: Joma Entry / Payments API — Unauthorized on Every Request

**Status:** fixed
**Found:** 2026-09-14
**Fixed:** 2026-09-14
**Region:** backend/auth

### Description

POST and PUT to `/api/payments` (used by the Joma Entry page) always returned **401 Unauthorized**. Staff could not create or edit payments. Same bug affected `/api/admin/auto-link`, `/api/admin/reset-password`, `/api/sync-sheets`, `/api/restore-sheets`.

### Root Cause

All five routes manually parsed the `sb-*-auth-token` cookie assuming a `base64-<base64url-json>` format and extracted `access_token` from it. This cookie format was specific to an older `@supabase/ssr` version. v0.12.4 writes a different cookie shape (plain JWT or chunked session), so the manual parser always produced an empty token → `getUser()` returned null → 401.

### Fix

Replaced all manual cookie parsing with the canonical `createClient()` from `lib/supabase/server.ts`, which uses `@supabase/ssr`'s `createServerClient` and correctly reads the current cookie format. Pattern matches the working `/api/receipts/[id]` route.

Affected routes:
- `app/api/payments/route.ts` (POST + PUT) — **Joma root cause**
- `app/api/admin/auto-link/route.ts` (POST)
- `app/api/admin/reset-password/route.ts` (POST)
- `app/api/sync-sheets/route.ts` (POST)
- `app/api/restore-sheets/route.ts` (POST)

Also corrected `/api/sync-sheets` comment that falsely claimed clients send an Authorization header — dashboard/admin pages send cookies only.

### Verification

- `tsc --noEmit`: zero errors project-wide
- Manual: Joma Entry form now submits successfully with staff session

### Preventative

Always use `lib/supabase/server.ts`'s `createClient()` for server-side auth. Never manually parse Supabase auth cookies — the format changes between `@supabase/ssr` versions.

---

## BUG-012: Sign-Up Metadata Set `role`/`is_approved` — Client-Controlled Privilege Escalation

**Status:** fixed
**Found:** 2026-09-29
**Fixed:** 2026-09-29
**Region:** backend/auth, frontend/auth

### Description

`app/signup/page.tsx` passed `{ role, is_approved }` into `supabase.auth.signUp({ options: { data } })`, and `handle_new_user()` in the auth trigger trusted `raw_user_meta_data`. Any self-registered account could become `admin` (or approve itself), and every server-side admin API keyed on the caller's role would have accepted it.

The same class of hole existed client-side: `components/providers.tsx` `ensureProfile()` upserted whatever role came back, and admin checks were copy-pasted inline in ~16 files with no shared definition.

### Root Cause

Auth metadata was treated as trusted input, and role checks were duplicated instead of centralized.

### Fix

- `supabase/migrations/20260929_harden_handle_new_user_role.sql` (+ `supabase/schema.sql`): `handle_new_user()` now hardcodes `role = 'member'`, `is_approved = false` and ignores all metadata. **Must be applied to the live database.**
- `app/signup/page.tsx` no longer sends `role`/`is_approved`.
- `components/providers.tsx`: `ensureProfile()` hardcodes `member`/`false` on insert and surfaces upsert failures via `profileError`.
- New `lib/auth.ts` — single source for `FOUNDER_EMAIL`, `isFounder`, `isStaff`, `isAdmin`, `isApproved`; all 16 inline email literals replaced.
- New `lib/server-auth.ts` — `requireAuth("staff" | "admin")` enforces session + `is_approved !== false` + role for every API route.

### Verification

`tsc --noEmit`, `eslint`, `pnpm build` clean; 28/28 ledger tests pass.

---

## BUG-013: "Today" / Current-Month Defaults Computed in UTC

**Status:** fixed
**Found:** 2026-09-29
**Fixed:** 2026-09-29
**Region:** frontend

### Description

Default payment dates and default coverage months were built from `new Date().toISOString().slice(0, 10)` / `.slice(0, 7)`. In UTC those roll over at 06:00 local time (Bangladesh is UTC+6), so for the first six hours of every day the Joma form, members, expenses, reports and admin pages defaulted to *yesterday*'s date / *last* month.

### Root Cause

No local-time date helper; ISO slicing used as a shortcut.

### Fix

Added `toLocalISODate`, `toLocalMonth`, `todayISO`, `currentMonthStr` to `lib/utils.ts` and converted every call site (dashboard, expenses, reports, admin bulk/pending/users/categories/members, joma, members, donations, `pending-pledges` API).

### Verification

Codemod scanned the tree: no remaining UTC-as-today usages; `tsc`/`eslint`/`pnpm build` clean.

---

## BUG-014: Missing Authorization on Admin Surfaces and the WhatsApp Route

**Status:** fixed
**Found:** 2026-09-29
**Fixed:** 2026-09-29
**Region:** backend/auth, frontend/auth

### Description

- `POST /api/notify/whatsapp` had **no auth check at all** — anyone on the internet could trigger WhatsApp Cloud API messages billed to the foundation.
- `/admin/members/[id]` had no role gate (there is no `app/admin/layout.tsx`) — any member holding a UUID could open a full payment ledger.
- Dashboard admin tiles (`/admin/audit`, `/admin/pending`, `/admin/bulk`, `/admin/auto-link`) were visible to every role.
- `GET /api/members/[id]/qr` linked to `/profile/{id}`, a route that does not exist (404).

### Fix

- All API routes now go through `requireAuth(...)` (staff or admin per route).
- `/admin/members/[id]` gates on `isStaff`, stops dropping query errors, and shows a retry screen.
- Tiles gated with `isAdmin`/`isStaff` helpers; QR now targets `/admin/members/{id}`.

### Verification

`tsc --noEmit`, `eslint`, `pnpm build` clean; 28/28 ledger tests pass.

---

## BUG-015: Database Write RPCs and Summary Views Were Reachable by `anon`

**Status:** fixed
**Found:** 2026-09-29
**Fixed:** 2026-09-29
**Region:** database
**Audit IDs:** DB-001, DB-006

### Description

A read-only catalog audit of the live projects (via the Supabase Management API) found:

- `save_payment_entry()`, `reallocate_payment()` and `backfill_payment_allocations()` are `SECURITY DEFINER` with **no internal auth check**. On Main they were executable by `anon` **and** `authenticated`; on Test by `anon` too (no revokes at all). Anyone with the public anon key could insert donations, rewrite allocations or regenerate the whole ledger.
- `admin_delete_user()` and `calculate_payment_allocation()` were executable by `anon`.
- All 6 summary views on Main (7 on Test, including `audit_log_view`) granted `SELECT` to `anon`, exposing member names/pledges, expense totals and the full audit trail without a session.

The app only ever calls the write RPCs server-side with the service-role key (`app/api/payments/route.ts`), so no client needs them.

### Root Cause

`SECURITY DEFINER` + Supabase's default `GRANT ... TO PUBLIC` on functions, and default view grants. RLS on the base tables is bypassed by owner-rights views, so the grant *is* the boundary for views.

### Fix

- `supabase/migrations/20260929_harden_definer_rpcs.sql` (Main) and `supabase/migrations-test/20260929_harden_test_project.sql` (Test): `REVOKE ... FROM PUBLIC, anon, authenticated` on the three write RPCs, `GRANT ... TO service_role`; `anon` revoked from `admin_delete_user`/`calculate_payment_allocation`; `anon` revoked from every view.
- Write-RPC signatures are pinned per project in the migration files — Main and Test differ (`p_extra_amount` exists only on Main), which is why Test has its own folder.

### Verification

Post-apply catalog check on both projects: `has_function_privilege('anon', ...) = false` for every write RPC, `anon_readable views = 0`, `authenticated` still holds the grants the app needs.

---

## BUG-016: Joma Pledge Changes Were Silently Discarded

**Status:** fixed
**Found:** 2026-09-29
**Fixed:** 2026-09-29
**Region:** database
**Audit IDs:** DB-011

### Description

`save_payment_entry()` on Main ignored `p_pledge_change_amount` / `p_pledge_effective_month` / `p_pledge_change_note` entirely: the API validated them, sent them, and the function threw them away. On Test the history row *was* written but `members.monthly_pledge` was never updated, so `/members` kept showing the old pledge. `reallocate_payment()` on Test recomputed allocations for a new coverage window but never stored that window on `donations`.

### Fix

- Main: `20260929_harden_definer_rpcs.sql` restores the pledge block — `UPDATE members SET monthly_pledge` + `INSERT INTO member_pledge_history` (mirror of the `/members` page behaviour).
- Test: `migrations-test/20260929_harden_test_project.sql` adds the `members.monthly_pledge` update and makes `reallocate_payment()` persist `coverage_start_month` / `coverage_end_month`.

### Verification

Function bodies re-read from the catalog; ledger test suite (28 cases) unaffected because the TypeScript engine is unchanged.

---

## BUG-017: Receipt Numbers Could Collide (No Lock + `lpad` Truncation)

**Status:** fixed
**Found:** 2026-09-29
**Fixed:** 2026-09-29
**Region:** database
**Audit IDs:** DB-003

### Description

`generate_receipt_no()` computed `max(digits)+1` with no lock (two concurrent inserts got the same number) and then called `lpad(x, 4, '0')`. PostgreSQL's `lpad` **truncates** on the right, so sequence `991783` produced `"9917"` — which had already been used. Probed live: the RPC returned `R-9917` while `R-991783` existed. `donations_receipt_no_key` (UNIQUE) then rejects the insert with a raw Postgres error.

### Fix

`pg_advisory_xact_lock(hashtext('public.donations.receipt_no'))` before reading the max, and pad only when the sequence is shorter than 4 digits. Applied on Main and Test.

### Verification

Catalog re-read shows the lock and the conditional pad; live probe no longer truncates.

---

## BUG-018: Self-Service Member Updates Could Rewrite Pledge, Status and Join Date

**Status:** fixed
**Found:** 2026-09-29
**Fixed:** 2026-09-29
**Region:** database
**Audit IDs:** DB-002

### Description

`members_update_own` lets an authenticated member `UPDATE` their own row. Nothing restricted *which* columns: a member could set their own `monthly_pledge` to 0 (silently erasing their due amount), flip `status` to `inactive` (removing themselves from every target) or change `join_date`.

### Fix

A `BEFORE UPDATE` trigger `enforce_member_self_update()` on `members`: service-role, `admin` and `treasurer` pass through; anyone else may only change `name`, `address` or `phone`, otherwise `RAISE ... ERRCODE 42501`. Added on Main and Test (Test also guards its extra `user_id` column).

### Verification

Trigger present on both projects (`trg_member_self_update`); `enforce_member_self_update()` is `SECURITY DEFINER` so it reads the caller's role from `public.users` rather than trusting client input.

---

## BUG-019: Zero-Sum Invariant Broken — 14 Legacy Donations Had No Allocations

**Status:** fixed
**Found:** 2026-09-29
**Fixed:** 2026-09-29
**Region:** database
**Audit IDs:** DB-012

### Description

On Main, `SUM(donations) = 7,850` but `SUM(payment_allocations) = 3,300`. The 14 donations recorded before 2026-09-08 (receipts `R-012` … `R-046`) had **zero** `payment_allocations` rows, and `backfill_payment_allocations()` — the function the 20260907 migration tells you to run — was missing from the live project entirely.

### Fix

`supabase/migrations/20260929_backfill_legacy_donations.sql`:
1. restores `backfill_payment_allocations()` (service-role only),
2. pins `coverage_start_month` / `coverage_end_month` on the legacy rows using the same fallback chain as `app/donations/page.tsx` (`coverage → donation_month → date`),
3. runs the backfill,
4. `RAISE EXCEPTION`s inside the migration if the invariant still doesn't hold (transaction aborts).

### Verification

`SUM(donations) = SUM(payment_allocations) = 7,850`, `unbackfilled = 0`, every donation's allocations sum to its own amount, Test project already at `7,442 = 7,442`.

---

## BUG-020: Live Summary View Ran a Never-Applied, Pre-ADR-002 Definition

**Status:** fixed
**Found:** 2026-09-29
**Fixed:** 2026-09-29
**Region:** database
**Audit IDs:** DB-004, DB-013

### Description

`20260907_monthly_collection_summary_from_allocations.sql` — the migration that makes `monthly_collection_summary` read `payment_allocations` (ADR-002) — was never applied to Main: the live view still used the older greedy re-implementation computed from `donations`, with no `coverage_*` awareness. So:

- reports disagreed with the ledger (live view said Sep = 4,350; `payment_allocations` says 3,000),
- docs claiming "this view reads from `payment_allocations`" were false for production,
- two different allocation algorithms were live at once, violating AGENTS.md's number-one rule.

The migration ledger (`supabase_migrations.schema_migrations`) confirms it: the newest recorded version is `20260907194636`.

### Fix

Applied `20260907_monthly_collection_summary_from_allocations.sql` to Main (Test already had it). Reports/Dashboard now single-source from `payment_allocations` — a month's number can be reconciled against the ledger row by row.

### Verification

View definition contains `allocated_totals` (`payment_allocations`); reported months now match `SUM(payment_allocations) BY month`: 2026-08 = 500, 2026-09 = 3,000. **User-visible:** September's reported collection drops from 4,350 to 3,000 and August rises 400 → 500.
