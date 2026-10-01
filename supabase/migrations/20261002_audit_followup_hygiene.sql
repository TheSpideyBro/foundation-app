-- Supabase audit follow-up hygiene - 2026-10-02
-- Source: ~/workspace/audits/foundation-app/SUPABASE_AUDIT_2026-10-02.md
-- Findings addressed: L-A1, L-A2, L-A3 (all Low - defense-in-depth hygiene,
-- no known exploit; each was "safe by accident" rather than by design).
-- Premises re-verified against the live catalog (project mlnzxhuozuyidpxepxex)
-- immediately before writing: the 5 trigger functions carry EXECUTE for
-- PUBLIC/anon/authenticated; the 6 views carry INSERT/UPDATE/DELETE/
-- TRUNCATE/TRIGGER for anon/authenticated; set_donation_month and
-- set_receipt_no lack SET search_path.
--
-- Conventions (AGENTS.md / docs/database/MIGRATIONS.md):
--   * Applied via the management API wrapped in BEGIN; ... COMMIT;
--     (the applier adds the wrapper - this file must NOT include it).
--   * Every statement idempotent (CREATE OR REPLACE / DO ... EXCEPTION)
--     so a partial application is safe to resume.
--   * Main project only (supabase/migrations/). Never cross-apply to Test.
--   * NOT applied yet - files only. After applying: regenerate
--     supabase/schema.sql and re-run the verification queries below.

-- ─────────────────────────────────────────────────────────────────────────────
-- L-A1 (LOW): trigger functions directly callable via RPC.
-- handle_new_user, log_audit_event, set_donation_month, set_receipt_no and
-- enforce_member_self_update are RETURNS trigger, yet EXECUTE was granted to
-- anon/authenticated. Direct calls fail safely today (NEW is NULL, so the
-- writes die on NOT NULL constraints - e.g. audit_log.action), but that is
-- safety-by-accident. Verified: no app code calls any of them via rpc()
-- (grep over app/, lib/, components/ is clean), and trigger firing does NOT
-- require the EXECUTE grant, so revoking cannot break inserts/updates.
-- postgres and service_role keep EXECUTE (least-privilege, trigger paths
-- and admin tooling unaffected).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.set_donation_month() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.set_receipt_no() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.enforce_member_self_update() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- L-A2 (LOW): meaningless DML grants on views.
-- All six summary views carried GRANT INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER
-- to anon/authenticated. Harmless (the aggregate views are not updatable and
-- member_directory writes would still be governed by base-table RLS), but
-- hygiene noise - revoke. SELECT grants are untouched; postgres and
-- service_role are untouched.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.donation_summary FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.expense_summary FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.expense_category_summary FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.monthly_collection_summary FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.member_summary FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.member_directory FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- L-A3 (LOW): set_donation_month / set_receipt_no lack SET search_path.
-- Non-definer trigger helpers with unqualified references (set_receipt_no
-- calls generate_receipt_no()). No attacker holds DDL privilege to plant a
-- shadow function, so risk was negligible - pinned opportunistically while
-- touching these functions. Bodies are byte-identical to the live versions;
-- only SET search_path = public is added.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_donation_month()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.donation_month IS NULL THEN
    NEW.donation_month := to_char(NEW.date, 'YYYY-MM');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_receipt_no()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.receipt_no IS NULL THEN
    NEW.receipt_no := generate_receipt_no();
  END IF;
  RETURN NEW;
END;
$function$;

NOTIFY pgrst, 'reload schema';

-- Verification (run after apply):
--   * no EXECUTE for anon/authenticated on the 5 trigger functions:
--     SELECT routine_name FROM information_schema.role_routine_grants
--     WHERE routine_schema='public' AND routine_name IN
--       ('handle_new_user','log_audit_event','set_donation_month',
--        'set_receipt_no','enforce_member_self_update')
--       AND grantee IN ('anon','authenticated','PUBLIC');  -- expect 0 rows
--   * no DML grants for anon/authenticated on the 6 views:
--     SELECT table_name, privilege_type FROM information_schema.role_table_grants
--     WHERE table_schema='public' AND table_name IN ('donation_summary',
--       'expense_summary','expense_category_summary','monthly_collection_summary',
--       'member_summary','member_directory')
--       AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER')
--       AND grantee IN ('anon','authenticated','PUBLIC');  -- expect 0 rows
--   * search_path pinned:
--     SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--     WHERE n.nspname='public' AND proname IN ('set_donation_month','set_receipt_no')
--       AND 'search_path=public' = ANY (p.proconfig);  -- expect 2 rows
--   * triggers still fire (rolled back, burns no receipt number - MAX+1 based):
--     BEGIN;
--     INSERT INTO public.donations (member_id, amount, method)
--       SELECT id, 1, 'cash' FROM public.members LIMIT 1
--       RETURNING receipt_no, donation_month;
--     ROLLBACK;
