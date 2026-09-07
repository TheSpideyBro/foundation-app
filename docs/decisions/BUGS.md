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