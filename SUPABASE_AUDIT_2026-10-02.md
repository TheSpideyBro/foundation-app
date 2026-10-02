# Supabase Pre-Migration Audit — 2026-10-02

**Project:** Daulkhar Foundation Main (`mlnzxhuozuyidpxepxex`)
**Purpose:** Read-only safety audit BEFORE applying `supabase/migrations/20261002_review_v2_db_hardening.sql`
**Auditor:** Muse (subagent) · **Date:** 2026-10-02 ~02:35 +06
**Method:** READ ONLY. No live DB credentials exist in this environment (`.env.local` values empty, no `SUPABASE_ACCESS_TOKEN`), so no live connection was possible. All catalog evidence below is quoted from `supabase/schema.sql` — the dump **generated from the live catalog** (header: "GENERATED FROM LIVE", project `mlnzxhuozuyidpxepxex`), generated **2026-10-01 03:05 +06** (~23.5h before this audit). No DDL migrations exist in the repo between the dump and this audit (only a data-only pledge-history INSERT on 10-01), so DDL drift risk in the window is low but not zero.

## Executive summary

1. **All 5 migration premises VERIFIED** against the live-catalog dump, with verbatim evidence quoted below — the migration targets exactly what it claims to target.
2. **No blockers found**: every migration statement is safe as written (idempotent, signatures match, no dependent objects break, revokes can't strand legitimate callers).
3. **RLS posture is disciplined**: 34 policies, RLS enabled on all 9 tables, zero `auth.role()` usage (all `get_my_role()`), no unrestricted `FOR ALL`.
4. **Caveat**: premises were verified against a 23.5h-old dump, not the live catalog — re-run the 5 premise checks at apply time; re-verify the zero-sum invariant after apply (last known Main: 7,850 = 7,850).
5. **Recommendation: CONDITIONAL GO** — apply the migration; no code or schema changes needed first. Details per area below.

---

## 1. Migration premise verification (all confirmed)

### (a) C1 — founder-email bypass live in `admin_delete_user` ✅ CONFIRMED
`supabase/schema.sql:295-301`:
```
-- admin_delete_user: authenticated=EXECUTE, service_role=EXECUTE
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'auth'
AS $function$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()
AND role = 'admin') AND COALESCE(auth.jwt() ->> 'email', '') <> 'saddamakash234@gmail.com'
THEN RAISE EXCEPTION 'Admins only'; END IF; ...
```
SECURITY DEFINER + EXECUTE to `authenticated` + email bypass all present. Migration replaces guard with `IF get_my_role() <> 'admin'` and deletes the email clause; body otherwise identical. **Safe:** strictly tightens; `get_my_role()` returns `'member'` for unknown uids, so the new guard is equivalent-or-stricter in every case.

### (b) H1 — 6 views lack `security_invoker`, SELECT granted to `authenticated` ✅ CONFIRMED
`supabase/schema.sql:617-619` (dump's own note):
```
--    NOTE: no security_invoker is set, so views run with owner rights
--    (RLS on the base tables does NOT apply). anon has no SELECT on any
--    view - authenticated and service_role only.
```
Grants confirmed per view, e.g. `:806` `GRANT SELECT ON public.donation_summary TO authenticated, service_role;` (same pattern at :827, :834, :848, :862, :876). `member_directory` (`:633-640`) selects `id, name, join_date, status, monthly_pledge, created_at` — pledge exposure confirmed. Migration's `ALTER VIEW … SET (security_invoker = true)` is the correct fix; **safe:** member-scope RLS policies exist for every base table (`donations_select_own`, `members_select_own`; expenses/pledge-history are staff-only → zero-row aggregates, and PostgREST `.single()` still works since aggregates always return one row). `service_role` bypasses RLS so service paths are unaffected. Documented behavior change (members lose foundation-wide totals) is a product trade-off, not a breakage.

### (c) M1 — `calculate_payment_allocation` EXECUTE to `authenticated` ✅ CONFIRMED
`:357`: `-- calculate_payment_allocation: authenticated=EXECUTE, service_role=EXECUTE`; `:361` SECURITY DEFINER; signature `(uuid, uuid, numeric, text, text, jsonb)` matches the migration's REVOKE exactly. Body reads `(SELECT monthly_pledge FROM public.members WHERE id = p_member_id)` — the oracle premise holds. **Revoke is safe:** all three in-DB callers are SECURITY DEFINER + service_role-only (`backfill_payment_allocations` :336, `reallocate_payment` :525, `save_payment_entry` :569) — nested calls run with definer rights, unaffected. No other callers in schema; repo grep found only a code comment.

### (d) M2 — `log_audit_event` LIMIT 1 fallback ✅ CONFIRMED
`:471`: `v_actor_id := coalesce(auth.uid(), (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1));`
`audit_log.actor_id` is `NOT NULL` (table def `:19-31`), so the migration's `ALTER COLUMN … DROP NOT NULL` is required and correct. Replacement function keeps the `RETURNS trigger` signature → existing triggers (`audit_donations`, `audit_expenses`, `audit_members`) stay bound. **Safe.** Historical misattribution is unfixable (documented, accepted).

### (e) L6 — `generate_receipt_no` granted to `anon` ✅ CONFIRMED
`:395`: `-- generate_receipt_no: anon=EXECUTE, authenticated=EXECUTE, service_role=EXECUTE`; signature `()` matches the migration's REVOKE. **Safe:** the only trigger path (`set_receipt_no` BEFORE INSERT on donations) can only fire for staff/service_role inserts (`donations_insert_staff` requires staff); `authenticated` keeps EXECUTE. Deliberately-kept `anon` grants on `get_my_*` helpers verified load-bearing (policies are `FOR … TO PUBLIC` and call them per evaluation).

---

## 2. RLS policy review — clean

- 34 policies across 9 tables; **RLS enabled on all 9 tables** (`:174-182`).
- **Zero `auth.role()`** — every policy uses `get_my_role()`, `get_my_member_id()`, `get_my_is_approved()`, or `auth.uid()`. The repo's #2 invariant holds live.
- No unrestricted policies: the only `FOR ALL` (`users_admin_all`) is admin-gated; `notices_select_all USING (true)` is intentional (public notices).
- `users_insert_self` hard-codes `role='member', is_approved=false, member_id IS NULL` — signup hardening intact.
- Gaps (info, not blockers): `member_pledge_history` has no UPDATE/DELETE policies (append-only even for admins — service_role only); `audit_log` has admin-SELECT only (inserts via definer trigger — correct, append-only).

## 3. SECURITY DEFINER functions — 11 total, grants reviewed

| Function | EXECUTE grants | Notes |
|---|---|---|
| `admin_delete_user` | authenticated, service_role | C1 — being fixed |
| `backfill_payment_allocations` | service_role | ✓ least privilege |
| `calculate_payment_allocation` | authenticated, service_role | M1 — being fixed |
| `reallocate_payment`, `save_payment_entry` | service_role | ✓ |
| `get_my_role`, `get_my_member_id`, `get_my_is_approved` | anon, authenticated, service_role | Load-bearing for RLS — must stay |
| `handle_new_user`, `log_audit_event`, `set_donation_month`, `set_receipt_no`, `enforce_member_self_update` | anon, authenticated, service_role | Trigger helpers — see Low findings |

All definers set `search_path` **except** `set_donation_month`/`set_receipt_no` (non-definer trigger helpers — low risk, flagged below).

## 4. Views — 6 total, all owner-rights, SELECT to authenticated+service_role

`donation_summary`, `expense_summary`, `expense_category_summary`, `monthly_collection_summary`, `member_summary`, `member_directory`. No `security_invoker` anywhere (dump states it explicitly). No functions, policies, or other views reference them (grep clean) — H1 change is contained. App code queries 5 of 6 (`expense_category_summary` has no call sites — matches migration's claim).

## 5. Triggers — no surprises for the migration

`donations`: `audit_donations` (log_audit_event), `tr_set_donation_month`, `tr_set_receipt_no`; `expenses`: `audit_expenses`; `members`: `audit_members`, `trg_member_self_update` (enforce_member_self_update). M2's `CREATE OR REPLACE` preserves the trigger-function signature — all bindings remain valid.

## 6. Storage — not verifiable

The dump script does not cover `storage.*`; no buckets/policies could be inspected. (No storage usage found in app code paths reviewed; treat as N/A unless the dashboard shows buckets.)

## 7. Auth config (`auth.users`) — not verifiable

No DB credentials → could not count users by role or confirm the founder row's role. The bypass premise (a) does not depend on it. **Recommend checking at apply time:** `select email, role from public.users where role='admin'` (public.users mirrors auth.users via trigger).

## 8. Grants sweep — no anomalies

No `GRANT ALL`. Table-level per-privilege grants to `anon, authenticated, service_role` are Supabase defaults with RLS as the enforcement layer — expected. Function EXECUTE grants reviewed in §3.

## 9. Data integrity — not verifiable live; structural guarantees noted

Could not run aggregates (no credentials). Structural facts from the dump: `donations.member_id NOT NULL` (NULL-member donations impossible), `donations_amount_positive CHECK (amount > 0)` (negative donations impossible), `receipt_no NOT NULL UNIQUE`. Last-known zero-sum per repo docs: Main **7,850 = 7,850** — **must be re-verified after apply** per repo convention.

---

## New findings (beyond migration scope) — severity-ranked

### 🟢 Low
- **L-A1 — Trigger functions directly callable via RPC.** `handle_new_user`, `log_audit_event`, `set_donation_month`, `set_receipt_no`, `enforce_member_self_update` are `RETURNS trigger` yet EXECUTE-granted to anon/authenticated. Direct calls fail safely today (`NEW` is NULL → constraint violations, e.g. `audit_log.action NOT NULL`), but this is safety-by-accident. Recommend `REVOKE EXECUTE … FROM anon, authenticated` on the five trigger functions in a follow-up (trigger firing does not need the grant).
- **L-A2 — Meaningless DML grants on views.** All 6 views carry `GRANT INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER` to anon/authenticated/service_role. Harmless (aggregates aren't updatable; `member_directory` writes would still be governed by base-table RLS), but hygiene noise — consider revoking in a follow-up.
- **L-A3 — `set_donation_month` / `set_receipt_no` lack `SET search_path`.** Non-definer trigger helpers; also `set_receipt_no` calls unqualified `generate_receipt_no()`. No DDL privilege exists for attackers to plant a shadow function — negligible, fix opportunistically.

### ℹ️ Info
- `member_pledge_history` is append-only via RLS (no UPDATE/DELETE policies) — corrections need service_role. Confirm intentional.
- `expense_category_summary` has no app call sites (dead view — candidate for removal later).

### ⚠️ Not verified (no credentials — recheck at apply time)
- The 5 premises against the **live** catalog (verified against 23.5h-old dump; drift window is small, no repo DDL in between, but out-of-band changes can't be ruled out).
- Zero-sum invariant, row counts, NULL/negative spot checks.
- `auth.users` role census and founder row role.
- Storage buckets/policies.

---

## Go / No-Go recommendation

**CONDITIONAL GO — apply the migration.**

- Every premise is confirmed against the live-catalog dump with verbatim evidence; every statement is idempotent and signature-matched; no dependent object breaks; revokes cannot strand legitimate callers (verified all 3 nested callers are definer/service_role-only).
- The migration correctly omits `BEGIN;`/`COMMIT;` (applier wraps) and ends with `NOTIFY pgrst, 'reload schema'`.
- **At apply time:** (1) re-run the 5 premise spot-checks against live (drift window), (2) apply via management API wrapped in `BEGIN;…COMMIT;`, (3) verify `SELECT SUM(amount) FROM payment_allocations` = `SELECT SUM(amount) FROM donations`, (4) regenerate `supabase/schema.sql`, (5) flip the SCHEMA.md row-17 marker from NOT YET APPLIED.
- After apply, the remaining pre-deploy blockers are non-DB: Lipighor font licensing, and the accepted H1 product trade-off (members lose foundation-wide totals — needs a staff-gated RPC if desired).
