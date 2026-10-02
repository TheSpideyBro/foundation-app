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

---

## BUG-021: save_payment_entry() Applies the Pledge Change AFTER It Allocates the Payment

**Status:** fixed
**Fixed:** 2026-09-30
**Found:** 2026-09-30
**Region:** database

### Description

`save_payment_entry()` (Main) reads `v_pledge_history`, inserts the donation, writes the `payment_allocations` rows and *only then* runs the `DB-011` pledge block (`UPDATE members` + `INSERT member_pledge_history`). The pledge change in the same entry therefore never influences that entry's own allocations, even for months `>= p_pledge_effective_month`.

The client preview (`calculatePaymentAllocation()` in `app/joma/page.tsx`) is computed from the same stale history, so preview and database agree — consistently wrong.

### Impact

Payment ৳500 for `2026-09` with a pledge change 300 → 500 effective `2026-09` allocates only 300 (200 goes `unallocated`) while `member_pledge_history` immediately says 500 is due for that month. `members` ledger, `monthly_collection_summary` and Reports then disagree with `payment_allocations` for the month the user just recorded.

Test project (`supabase/migrations-test/20260929_harden_test_project.sql`) has the same ordering defect.

### Fix

`supabase/migrations/20260930_pledge_change_before_allocation.sql` (Main) and `supabase/migrations-test/20260930_pledge_change_before_allocation.sql` (Test) move the pledge block to the **top** of both `save_payment_entry()` and `reallocate_payment()` — after the guards and before `v_pledge_history` is read — so the history read already contains the new row and months `>= p_pledge_effective_month` are priced at the new amount. `members.monthly_pledge` is still updated (the engine falls back to it for months with no history row).

### Verification

Applied to Main and Test. Live run (both projects, inside a rolled-back transaction): pledge 100 → 150 effective `2026-09`, payment ৳150 for `2026-09` → `sept_allocated = 150` (was 100 before the fix), `total_allocated = 150`, `member_pledge_after = 150`, `history_rows = 1`. Zero-sum unchanged: Main `7,850 = 7,850`, Test `7,442 = 7,442`.

---

## BUG-022: Coverage Windows Over 120 Months Diverge Between the TS Preview and the SQL Engine

**Status:** fixed
**Fixed:** 2026-09-30
**Found:** 2026-09-30
**Region:** code + database

### Description

`monthRange()` (`lib/payment-ledger.ts`) silently truncates at 121 months; `calculate_payment_allocation()` in SQL loops over the whole `generate_series` range with no cap. The Joma form's `<input type="month">` fields impose no span limit, so a window of 122+ months produces a confirmation dialog and success numbers that do not match what `save_payment_entry()` stores.

### Impact

Zero-sum still holds (allocations sum to the amount) but the month-by-month split the user confirmed is not the split that is saved — a silent, unreviewable divergence between the two canonical engines (AGENTS.md rule 1).

### Fix

One limit, enforced on both sides: `MAX_COVERAGE_MONTHS = 120` in `app/api/payments/route.ts` (the window is rejected with `{ code: "invalid_coverage" }`) and the same span computed from `p_coverage_start`/`p_coverage_end` in `save_payment_entry()` / `reallocate_payment()` (`RAISE EXCEPTION 'Coverage range must be between 1 and 120 months'`). The Joma confirmation dialog blocks the window before the request is sent, so the preview, the API and the SQL engine can no longer disagree.

### Verification

Live: coverage `2015-01 → 2030-12` (192 months) rejected by the SQL guard. eslint + `pnpm build` clean; `pnpm test:ledger` 28/28.

---

## BUG-023: pledge_effective_month Is Unvalidated — a Past Month Silently Restates Settled History

**Status:** fixed
**Fixed:** 2026-09-30
**Found:** 2026-09-30
**Region:** database + api

### Description

Neither the API nor `save_payment_entry()` validates `p_pledge_effective_month`. A user can pick an effective month years in the past, which rewrites the expected pledge for every month from there on — retrospectively changing dues, back-payment and collection totals for months that are already reported. There is no format check either: anything but `YYYY-MM` corrupts the `effective_from_month <= month` string comparisons in `resolvePledgeForMonth()`.

### Impact

One wrong dropdown selection restates months of history in `monthly_collection_summary`, member ledgers and Reports, with no warning anywhere in the flow.

### Fix

Two layers, both requiring `p_pledge_change_amount`:

- API (`app/api/payments/route.ts`): `validatePledgeChange()` checks `YYYY-MM` format and `effective >= coverage_start`, returning `{ code: "invalid_pledge_effective_month" }`.
- SQL (`20260930_pledge_change_before_allocation.sql`, Main + Test): the same two checks `RAISE EXCEPTION` before anything is written, so a non-API caller cannot bypass them.

Backdating inside the coverage window is still allowed (a mid-coverage pledge change is a legitimate use); only months *before* the coverage start are rejected.

### Verification

Live (both projects): effective `2026-01` with coverage starting `2026-09` → `Pledge effective month cannot be before the coverage start month`; effective `2026-13` → `Pledge effective month must be YYYY-MM`; coverage `2026-1` → `Coverage months must be YYYY-MM`. Valid entries still succeed (see BUG-021 verification).

---

## BUG-024: Reports Cash Fallback Counts donations.amount AND extra_amount

**Status:** fixed
**Fixed:** 2026-09-30
**Found:** 2026-09-30
**Region:** app

### Description

`app/reports/page.tsx` computes the cash-side fallback as `Number(d.amount) + Number(d.extra_amount)`. `donations.amount` **already includes** the extra (`save_payment_entry()` stores `p_amount + p_extra_amount`), so the fallback counts the extra twice. `app/donations/page.tsx` carries an explicit comment stating this invariant.

### Impact

Used only when `monthly_collection_summary` returns no rows (view missing / out of range) — then "সংগ্রহ" is inflated by `SUM(extra_amount)`.

### Fix

`app/reports/page.tsx` sums `donations.amount` only in the cash fallback, with a comment restating the invariant that `amount` already includes `extra_amount` (`save_payment_entry()` stores `p_amount + p_extra_amount`).

### Verification

`pnpm build` + eslint clean. The fallback is only reached when `monthly_collection_summary` returns no rows; with rows present `collected` still comes from the view, so the normal reports path is unchanged.

---

## BUG-025: /api/payments Accepts an Arbitrary Method and a Non-Staff Collector

**Status:** fixed
**Fixed:** 2026-09-30
**Found:** 2026-09-30
**Region:** api

### Description

`POST /api/payments` validates that `method` and `collected_by` are *present*, nothing more:

- `method` is free text — there is no CHECK on `donations.method`, so any string lands in the table and breaks the method filter/receipt/report assumptions (the app's own set is `cash|bkash|nagad|bank`).
- `collected_by` only has to resolve to *some* row in `users` — a member's own account may be recorded as the collector of a staff payment. The RPC runs as `service_role`, so RLS does not catch it.
- `date` is only checked for presence: no `YYYY-MM-DD` format check and no future-date check.

### Impact

Dirty rows in `donations`, unattributable collections, and future-dated cash inflating the current period in Reports/Dashboard.

### Fix

`app/api/payments/route.ts` now validates the whole payload:

- `method` against the app's own whitelist (`cash|bkash|nagad|bank` — the same set as `lib/supabase-client.ts`)
- `collected_by` must resolve to an **approved** `admin`/`treasurer` (or the founder email) — `403` otherwise, because the RPC runs as `service_role` and RLS never sees the caller
- `date` must be a real `YYYY-MM-DD` date and at most one day ahead of the server clock (a UTC+ operator's "today" is still yesterday on the server, so a strict `<= today` would reject valid entries)
- `receipt_no` length/whitespace, and coverage months as `YYYY-MM` with a ≤120-month window (BUG-022)

### Verification

eslint + `pnpm build` clean; rejections return `{ code, error }` and the UI shows `error` verbatim (Bengali).

---

## BUG-026: /api/payments Returns Raw Postgres Errors to the Browser

**Status:** fixed
**Fixed:** 2026-09-30
**Found:** 2026-09-30
**Region:** api

### Description

Both `POST` and `PUT` return `error.message` verbatim (`route.ts` catch blocks and the RPC error branch). Constraint names, column names and SQL fragments are rendered directly into the UI error banner. The only translated case is the duplicate receipt number, and that translation is matched with a `/duplicate key|receipt_no/i` regex against the raw text.

### Impact

Schema/SQL disclosure to any authenticated staff session, plus unstable user-facing messages that change whenever Postgres wording changes.

### Fix

Both handlers return `{ code, error }`: a stable machine `code` plus Bengali text. Known SQL messages are mapped through `SQL_ERRORS`; anything unknown is logged with `console.error` on the server and replaced by a generic message. The duplicate-receipt path keys off `code === "duplicate_receipt"` (the old `/duplicate key|receipt_no/i` regex is kept only as a fallback for a stale server).

### Verification

No `error.message` reaches `NextResponse.json` — grep shows the raw Postgres text only in `console.error`.

---

## BUG-027: Joma Entry Renders the Role Gate Before the Auth-Loading Gate

**Status:** fixed
**Fixed:** 2026-09-30
**Found:** 2026-09-30
**Region:** app

### Description

`app/joma/page.tsx` uses `const { user, role } = useAuth()` — it never reads `loading`. On a first render where the auth context has not resolved yet (`role === null`), `isStaff` is false and the page paints the "প্রবেশাধিকার সংরক্ষিত" screen for staff users, then swaps to the form. `app/layout-wrapper.tsx` normally covers this by holding the whole tree behind its own spinner, but the page itself has no guard and re-introduces the flash the moment that wrapper changes (and during any render where `role` is still `null`).

### Impact

Staff see a wrong, alarming access-denied screen briefly (or on any auth-timing regression), and the same pattern exists on `/donations` and `/expenses`.

### Fix

`app/joma/page.tsx` destructures `loading` from `useAuth()` and renders the spinner **before** the staff gate, so `isStaff` is never evaluated while `role` is still `null`.

### Verification

`pnpm build` + eslint clean. `app/layout-wrapper.tsx` already holds the whole tree behind its own spinner during auth bootstrap; the page now carries the same guard instead of depending on it.

---

## BUG-028: Joma Success Screen — Inconsistent Totals, English Label, Stale Member Search

**Status:** fixed
**Fixed:** 2026-09-30
**Found:** 2026-09-30
**Region:** app

### Description

Four separate defects in one flow:

1. `memberSearch` is not cleared when the form resets — the box keeps the previous member's name while `memberId` is empty, so the next save fails with "সদস্য নির্বাচন করুন" against a box that *looks* filled.
2. The same "অবণ্টিত / অতিরিক্ত" label shows three different numbers: the right-hand preview and confirm dialog show `unallocatedAmount` (regular only), the success screen shows `unallocatedAmount + extraAmount`.
3. The success card labels the extra amount **"Extra Amount"** — English in a Bengali-first UI (AGENTS.md code style).
4. `৳{row.expected}` in the pledge-breakdown row bypasses `money()`, so decimals/en-US separators leak through.

### Impact

Users cannot reconcile the preview against the confirmation against the receipt, and the form appears to remember a member it did not save.

### Fix

1. `memberSearch` and `showMemberDropdown` are cleared with the rest of the form on success.
2. One label, one number: the confirm dialog, the preview panel and the success screen all show **অবণ্টিত** = the regular leftover only; the extra amount has its own row (confirm) / card (success) everywhere, and the preview panel gained an **অতিরিক্ত জমা** and a **মোট নগদ** line.
3. Success numbers no longer fold `extraAmount` into `unallocatedAmount`.
4. "Extra Amount" → "অতিরিক্ত জমা"; `৳{row.expected}` and the status badge go through `money()`.

### Verification

Reconciliation on one screen: `বরাদ্দকৃত + অবণ্টিত = জমা`, and `জমা + অতিরিক্ত = মোট নগদ`; the receipt shows `জমা + অতিরিক্ত` as পরিমাণ.

---

## BUG-029: Joma Seeds the Collector With an ID That Is Not in the Dropdown

**Status:** fixed
**Fixed:** 2026-09-30
**Found:** 2026-09-30
**Region:** app

### Description

`collectedBy` is seeded with `user.id` unconditionally, but the options are loaded with `.in("role", ["admin", "treasurer"])`. An account that passes `isStaff()` through the founder bypass while its `users.role` row is neither of those (or any user outside that list) gets a pre-filled value that has no `<option>`, so the select renders blank while validation passes and a payment is saved with a collector the operator never saw.

### Impact

Silently wrong `donations.collected_by`.

### Fix

The collector is seeded only when `users.id` is in the loaded `role IN ('admin','treasurer')` list; otherwise the select keeps the placeholder and `openConfirm()` asks for one.

### Verification

eslint/build clean, and `POST /api/payments` independently rejects a `collected_by` that is not an approved staff account (BUG-025) — the UI seed is a convenience, the API is the guarantee.

---

## BUG-030: Joma Entry — No Abort Handling, Dead Import, Wrong Back Navigation, Unsorted Member List

**Status:** fixed
**Fixed:** 2026-09-30
**Found:** 2026-09-30
**Region:** app

### Description

- The submit `fetch()` has no `AbortController`/timeout: if the request hangs the button is stuck on "সংরক্ষণ হচ্ছে..." forever with no retry path (the confirm dialog is already closed).
- `formatMonth` is imported from `lib/payment-ledger.ts` and never used (`monthLabel` is the one in use).
- `handleCancel()` navigates to `/donations` even though the control is labelled "ফিরে যান" (go back).
- The member dropdown lists members in raw name order, so `status === "inactive"` members sit among active ones with only a small tag.

### Impact

Stuck UI on a network hiccup, misleading navigation, and easier mis-selection of an inactive member.

### Fix

- Submit runs through an `AbortController` with a 30 s timeout, aborted on unmount; `AbortError` shows "সার্ভার থেকে সাড়া পাওয়া যায়নি — আবার চেষ্টা করুন" instead of a stuck button.
- Unused `formatMonth` import dropped.
- `handleCancel()` → `router.back()` (falls back to `/donations` when there is no history), matching the "ফিরে যান" label.
- Member dropdown sorts active members first — inactive stay selectable for a final settlement, and the stable sort keeps the name order inside each group.

### Verification

eslint + `pnpm build` + Playwright (3 passed, 6 skipped, the 6 need live credentials).

---

## BUG-031: "Current Pledge" Labels Print members.monthly_pledge, Which the Engine May Never Charge

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-10-01
**Region:** app + data

### Description

`members.monthly_pledge` is only the **fallback** for months with no `member_pledge_history` row. The canonical rule (ADR-001) is *latest applicable history entry (`effective_from_month <= month`) → `members.monthly_pledge` → 0*, so a history row with a later effective month always wins — and `monthly_pledge` can disagree with it.

Live example (Main, member `a40ef6db…`, সাদ্দাম হোসেন আকাশ):

| row | effective | amount | inserted |
|-----|-----------|--------|----------|
| 1 | `2026-08` | ৳100 | 2026-09-15 |
| 2 | `2026-09` | ৳1,000 | 2026-09-08 |

`monthly_pledge` = ৳100 (the newer change), but Sep/Oct/Nov all resolve to **৳1,000**. Every "current pledge" label printed the raw field: the Joma card "বর্তমান মাসিক অঙ্গীকার ৳১০০", "বর্তমান চাঁদা", the sidebar pledge-change arrow, the `1x/2x/3x চাঁদা` buttons (৳100/200/300), the `/admin/members/[id]` header, the `/members` list card and Reports' "মাসিক pledge" column — while the allocation preview inches away allocated at ৳1,000/month.

### Impact

Two different numbers for the same member on the same screen: a user who trusts the card expects ৳1,000 / ৳100 / ৳100 for Sep–Nov and instead sees `1000 / 300 / 0` (৳1,300 entry), and the quick-amount buttons quote a month of the wrong pledge.

### Fix

One rule, applied everywhere a "current pledge" is *shown*:

- **Joma**: `currentMonthPledge` = `resolvePledgeForMonth(curMonth, effectiveMonthlyPledge, effectivePledgeHistory)` feeds the card, "বর্তমান চাঁদা" and the sidebar arrow (a pledge change pending in the form is reflected live). `coveragePledge` (resolved for `form.coverageStartMonth`) feeds `1x/2x/3x চাঁদা`.
- **`/admin/members/[id]`** header, **`/members`** list card (now also loads `member_pledge_history`; a denied read degrades to the old raw value) and **Reports** members column/CSV/PDF all resolve for the current month.

The engine fallback argument is deliberately untouched: `effectiveMonthlyPledge` / `members.monthly_pledge` is still what `calculatePaymentAllocation()` receives, because the SQL twin reads that same field — only the *labels* were wrong.

**Data half.** The labels were wrong, but the member's history was also wrong: the ৳100 change had been saved with `effective_from_month = 2026-08`, so it only ever covered August while September onward kept charging ৳1,000. Operator confirmed on 2026-10-01: **September stays ৳1,000, October onward is ৳100.** Migration `20261001_pledge_history_akash_october.sql` inserts the missing row (idempotent) and asserts both resolutions plus `members.monthly_pledge`; it changes no existing history row, donation or allocation.

### Verification

tsc + eslint + `pnpm build` clean, `pnpm test:ledger` 28/28, Playwright 3 passed / 6 skipped. For the reported member every label now resolves to ৳1,000 for `2026-09`…`2026-11` (the `2026-09 → ৳1,000` row wins), matching the preview and `calculate_payment_allocation()` (`1200 → 1000/200/0`, `1300 → 1000/300/0`).

After `20261001_pledge_history_akash_october.sql` ran on Main: three history rows (`2026-08 → 100`, `2026-09 → 1000`, `2026-10 → 100`), the ADR-001 rule resolves `2026-08 → 100`, `2026-09 → 1000`, `2026-10`/`2026-11`/`2026-12 → 100`, `members.monthly_pledge` = 100 (agrees with the newest row), and the zero-sum invariant is untouched: `SUM(donations) = SUM(payment_allocations) = 7,850` (30 donations, 77 allocations).

## BUG-032: Receipt QR Codes Pointed at a Nonexistent /verify Route

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-10-01
**Region:** app

### Description

Every printed receipt carries a QR code whose payload was `/verify/{receipt_no}` — but no such route existed in the app, so scanning a receipt's QR landed on a 404. The entire receipt-trust feature was dead. Additionally, the QR URL was hardcoded to `https://daulkharfoundation.vercel.app`, so receipts generated on any other domain (staging, custom domain) pointed at the wrong place, and nothing told the donor to scan the code.

### Impact

The foundation's main anti-fraud affordance (donors verifying their receipt) was completely broken; every receipt printed to date has a dead QR.

### Fix

- New public page `app/verify/[receipt_no]/page.tsx`: Server Component, no login required (whitelisted in `proxy.ts`). Shows a "যাচাইকৃত রসিদ" badge, receipt number, amount in Bengali digits + words (`numberToWordsBengali`), covered month(s), date, and collector. Donor name is masked to the first 3 code points + •••. Unknown receipt numbers render a branded "রসিদ পাওয়া যায়নি" card, not the raw Next.js 404.
- Lookup uses the service-role key inside the Server Component only, selecting only verification fields (AGENTS.md rule 1).
- `app/api/receipts/[id]/route.ts`: QR payload now uses `NEXT_PUBLIC_SITE_URL` with `request.nextUrl.origin` fallback; a "স্ক্যান করে যাচাই করুন" caption was added under the QR.

### Verification

`npx tsc --noEmit` clean, `pnpm build` 30/30 routes with `ƒ /verify/[receipt_no]` dynamic. Old printed receipts (whose QR encodes the old hardcoded domain) will still fail if that domain isn't this app — nothing can fix paper already printed.

---

## BUG-033: Bulk Import Parsed Admin-Uploaded Files with Unpatched xlsx and No Row Cap

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-10-01
**Region:** frontend + API

### Description

`app/admin/bulk/page.tsx` parsed admin-uploaded spreadsheets with `xlsx@0.18.5` — unmaintained with known prototype-pollution/ReDoS CVEs — and POSTed whatever it parsed to `/api/admin/bulk` with no row cap and no server-side validation: the API inserted rows as received.

### Impact

A malicious or corrupt spreadsheet could DoS the browser tab, and oversized payloads could be written straight to `members`/`donations`/`expenses` with no validation gate.

### Fix

- `xlsx@0.18.5` → `@e965/xlsx@0.20.3` (drop-in: same `read`/`utils` API, patched CVEs) in `package.json` and both import sites (bulk page, reports page). NOTE: `pnpm-lock.yaml` still points at `xlsx` — run `pnpm install` to regenerate before deploy.
- Client: file validation (5 MB cap, extension/MIME, try/catch with Bengali errors), per-section template download with exact expected headers, parse preview (Bengali row count + first-5-rows table) with a "নিশ্চিত করুন" confirm step before POST, 500-row cap, progress text, `role="status"`.
- Server (`app/api/admin/bulk/route.ts` POST): rejects `items.length > 500` with 413; every row is validated against a per-table column allow-list with type checks before insert — fail-closed: nothing inserts if any row errors; returns per-row `{row, error}` list (Bengali, max 50).

### Verification

`npx tsc --noEmit` clean, `@e965/xlsx` import smoke-tested (`read`/`utils` present), `pnpm build` green. The API's per-row validation rejects unknown columns and wrong types before any insert.

---

## BUG-034: Founder Email Bypass Granted Admin Outside the Role Model

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-09-30 (audit H2)
**Region:** frontend + API

### Description

`lib/auth.ts` contained a hardcoded `FOUNDER_EMAIL` constant and `isFounder()` helper that made `isAdmin()`/`isStaff()` return `true` for one email address regardless of `users.role`. It could not be revoked from the database, bypassed RLS semantics, and lived in code/env rather than a role row. Call sites in ~15 pages passed `user?.email` as a second argument.

### Impact

Privilege was conferred by a string literal, not by data. Rotating it required a code deploy; anyone who could set that env/email controlled admin access.

### Fix

- `FOUNDER_EMAIL` and `isFounder()` deleted from `lib/auth.ts`; `isAdmin()`/`isStaff()` are now purely `users.role`-based (TD-001 → resolved).
- `lib/server-auth.ts`, `app/api/payments/route.ts` (collector check is now `isApproved(...) && isStaff(collector.role)`), all page call sites: email argument dropped.
- `NEXT_PUBLIC_FOUNDER_EMAIL` removed from `.env.example`; `SETUP.md` auth reference updated.
- Docs: `docs/architecture/SECURITY.md`, `docs/development/ROLES.md`, `docs/architecture/SYSTEM.md`, `docs/decisions/TECH_DEBT.md` updated.

### Verification

`grep -r "isFounder\|FOUNDER_EMAIL" --include="*.ts*" .` is clean; `npx tsc --noEmit` clean; `pnpm build` 30/30.

⚠️ **Deploy gate:** confirm the founder's `users.role = 'admin'` in the LIVE database before deploying, or the founder will be locked out of admin screens and APIs (`/admin/users` can set the role).

---

## BUG-035: CSP Was Commented Out; X-Frame-Options: DENY Broke the Receipt Preview

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-09-30 (audit M1) / 2026-10-01 (UI review H1)
**Region:** config

### Description

`next.config.ts` had the Content-Security-Policy commented out entirely (no injection/XSS defense-in-depth), while `X-Frame-Options: DENY` blocked the app's own same-origin receipt preview `<iframe>` on `/donations`, rendering a blank preview.

### Impact

No CSP protection at all; a broken core UI element (receipt preview).

### Fix

- CSP enabled, adapted to actual needs: `script-src 'self' 'unsafe-inline'` (Next.js App Router injects inline bootstrap scripts; per-request nonces would need middleware — noted as future work), `style-src 'self' 'unsafe-inline'` + Google Fonts (Tailwind v4), `font-src` googleapis/gstatic, `img-src data:/blob:/https:`, `connect-src 'self'` + `*.supabase.co`. `api.qrserver.com` dropped (QR is server-generated).
- `X-Frame-Options: DENY` → `SAMEORIGIN`; deprecated `X-XSS-Protection` header removed.

### Verification

`pnpm build` green; receipt preview iframe on `/donations` loads same-origin again. Nonce-based CSP remains future work.

---

## BUG-036: Middleware Skipped the Auth Gate When Supabase Env Was Missing

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-10-01
**Region:** middleware

### Description

If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` were unset, `proxy.ts` skipped the Supabase session check and let the request through — protected routes were effectively public in a misconfigured environment.

### Impact

Fail-open: a deploy missing env vars would expose every protected route.

### Fix

Middleware now fails closed: when Supabase env is missing, protected routes redirect to `/login`; only the explicit public paths (`/`, `/login`, `/signup`, `/verify/*`) remain reachable.

### Verification

Code path reviewed; `pnpm build` green. (Not exercised live — exercising it requires a deploy without env, which is exactly the failure mode.)

---

## BUG-037: Login Ignored callbackUrl, Always Landing on /dashboard

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-10-01 (UI review H5)
**Region:** app

### Description

`app/login/page.tsx` hardcoded `router.push("/dashboard")` after sign-in, so deep links (e.g. `/admin/pending` shared in a message) were lost — the user had to navigate back manually.

### Impact

Broken deep-linking; shared admin links landed users on the dashboard instead of the intended page.

### Fix

Login honors `?callbackUrl=`, validated same-origin (must start with `/` and not `//`; falls back to `/dashboard`). Wrapped in `Suspense` for `useSearchParams` (Next.js 16 static prerender requirement).

### Verification

`npx tsc --noEmit` clean; `pnpm build` green (no prerender bailout for `/login`).

---

## BUG-038: Expenses Used Native alert() and Accepted Negative Amounts

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-10-01 (UI review H7/H8)
**Region:** app

### Description

All three expense error paths used blocking native `alert()` (inconsistent with the rest of the app, inaccessible, no Bengali), and the amount input accepted `0`/negative values client-side even though the DB has `CHECK (amount > 0)` — a confusing DB error was the only guard.

### Impact

Poor error UX; users could submit amounts the database would reject with an English constraint error.

### Fix

- All three `alert()` calls → inline banners: form validation + save errors in a dismissible modal banner; delete errors in a page-top banner (mirrors the existing `loadError` pattern). Delete still uses native `confirm()` (out of scope).
- Client validation rejects `amount <= 0` with a Bengali message; input gets `min="0.01"` + `inputMode="decimal"`.
- Amounts via `formatMoney` (Bengali digits), dates via `formatDateBengali`; dead `proof_url` state removed; loading spinner → skeleton rows.

### Verification

`npx tsc --noEmit` clean; `pnpm build` green.

---

## BUG-039: Bulk Import API Inserted Rows With No Validation or Row Cap

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-09-30 (audit M6)
**Region:** API

### Description

`POST /api/admin/bulk` inserted whatever the client sent — no row cap, no column allow-list, no type checks. Combined with BUG-033's unpatched parser, admin uploads were an unvalidated write path into `members`/`donations`/`expenses`.

### Impact

Corrupt or malicious payloads could write arbitrary-shaped data into core tables.

### Fix

- POST rejects `items.length > 500` with 413.
- Every row validated against a per-table column allow-list (`members`/`donations`/`expenses`) with type checks before any insert — fail-closed: nothing inserts if any row errors; per-row `{row, error}` list (Bengali, max 50) returned.
- GET export paginated (`limit` default 1000, max 5000; `offset`).

### Verification

`npx tsc --noEmit` clean. Validation logic reviewed; fail-closed behavior (no partial inserts) is by construction — all rows validated before the first insert.

---

## BUG-040: GET /api/sync-sheets Revealed Backup Status With No Auth

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-09-30 (audit L1)
**Region:** API

### Description

`GET /api/sync-sheets` reported whether the Google Sheets backup was configured with no authentication — an information leak about infra setup to anonymous callers.

### Impact

Low: configuration disclosure, no data exposed.

### Fix

GET is now gated by `requireAuth("admin")`. No client calls GET (only POST), so nothing breaks.

### Verification

`npx tsc --noEmit` clean; `pnpm build` green; no client-side GET callers found.

---

## BUG-041: Audit Log Page Loaded the Entire audit_log Table

**Status:** fixed
**Fixed:** 2026-10-01
**Found:** 2026-09-30 (audit M6)
**Region:** app

### Description

`app/admin/audit/page.tsx` fetched the whole `audit_log` table in one query — unbounded growth means an ever-slower page and a heavy read.

### Impact

Performance degrades as the log grows; one huge initial query per admin visit.

### Fix

`.range()` pagination (50/page) with an "আরো দেখুন" load-more button; existing search filter works over loaded rows; total shown in Bengali digits.

### Verification

`npx tsc --noEmit` clean; `pnpm build` green.

## BUG-042: enforce_member_self_update Trigger Lets Members Self-Reduce Pledge / Flip Status

**Status:** fixed (2026-10-02 — `supabase/migrations/20261003_review_v3_db_fixes.sql` applied live to Main ~11:40 +06; premises re-verified at apply time, post-apply checks green)
**Found:** 2026-10-03 (review v3, S-M1)
**Region:** database

### Description

The `BEFORE UPDATE` trigger `trg_member_self_update` on `members` is supposed to restrict
self-service profile updates to name, address, and phone only
(`docs/decisions/BUGS.md` documents this intent). Its first `IF` returns early —
allowing the row — whenever *any* allowed field changed:

```sql
IF NEW.id IS DISTINCT FROM OLD.id
   OR NEW.name IS DISTINCT FROM OLD.name
   OR NEW.address IS DISTINCT FROM OLD.address
   OR NEW.phone IS DISTINCT FROM OLD.phone THEN
  RETURN NEW;   -- allows EVERYTHING, including protected fields
END IF;
```

so the protected-field check below it never runs in that case. A member can run

```sql
UPDATE members SET address = address || ' ', monthly_pledge = 0 WHERE id = <own id>
```

via the anon-key PostgREST endpoint and it passes. The RLS policy `members_update_own`
has **no column restrictions** (USING / WITH CHECK only pin `id`), so this trigger is
the *only* guard — and it is bypassable.

### Impact

A member can self-reduce `monthly_pledge` to 0 (future payments allocate as
`unallocated`) or flip `status` to `'inactive'` to vanish from arrears/targets.
The app UI (`app/profile/page.tsx`) only sends name/address/phone, so exploitation
needs direct API calls — trivial in devtools for any authenticated member.

### Root Cause

Order of checks: the allowed-field early return precedes the protected-field raise,
so changing any allowed field alongside a protected field skips the guard entirely.

### Planned fix

Migration `supabase/migrations/20261003_review_v3_db_fixes.sql` (prepared, not yet
applied to live): check protected fields **first** and raise `ERRCODE 42501` on any
change to `monthly_pledge`, `status`, `join_date`, or `created_at`; otherwise
`RETURN NEW`. The allowed-field allowlist is dropped — everything except the four
protected fields is permitted, which is exactly the documented intent.

## BUG-043: admin_delete_user Fails on FK Constraints — Cannot Delete Staff With History

**Status:** fixed (2026-10-02 — `supabase/migrations/20261003_review_v3_db_fixes.sql` applied live to Main ~11:40 +06; premises re-verified at apply time, post-apply checks green)
**Found:** 2026-10-03 (review v3, S-M2)
**Region:** database

### Description

`admin_delete_user(target_user_id)` nulls `donations.created_by` / `donations.collected_by`
and then `DELETE FROM auth.users`, but four other tables hold `created_by`
foreign keys to `auth.users(id)` **with no `ON DELETE` action**:

- `member_pledge_history.created_by`
- `payment_allocations.created_by`
- `expenses.created_by`
- `notices.created_by`

(`supabase/schema.sql` constraints `*_created_by_fkey`.) Deleting any treasurer/admin
who ever created a record in one of these tables raises an FK violation, the whole
statement rolls back, and `app/api/admin/delete-user/route.ts` returns 409 with a
raw FK error. (`public.users` is fine — `users_id_fkey` has `ON DELETE CASCADE`;
the last-admin case is safe because self-deletion is blocked.)

### Impact

The "remove staff" admin control is functionally broken for real staff — an admin
cannot cleanly revoke a compromised staff account.

### Root Cause

The `created_by` FKs on the four tables were added after the delete-user RPC was
written; the RPC's null-out list was never extended to cover them.

### Planned fix

Migration `supabase/migrations/20261003_review_v3_db_fixes.sql` (prepared, not yet
applied to live): `UPDATE ... SET created_by = NULL` on the four tables before
the `DELETE FROM auth.users`, mirroring the existing `donations` nulling.
