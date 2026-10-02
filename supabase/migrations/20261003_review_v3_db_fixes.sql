-- Review v3 DB fixes - 2026-10-03
-- Source: ~/workspace/audits/foundation-app/REVIEW_2026-10-03_v3.md
-- Findings addressed: S-M1, S-M2 (both Medium, security).
-- BUG entries: docs/decisions/BUGS.md BUG-042 (S-M1), BUG-043 (S-M2).
-- Function bodies below were copied verbatim from the live catalog dump
-- (supabase/schema.sql, project mlnzxhuozuyidpxepxex) and then edited only
-- where the finding requires; everything else is byte-identical.
--
-- Conventions (AGENTS.md / docs/database/MIGRATIONS.md):
--   * Applied via the management API wrapped in BEGIN; ... COMMIT;
--     (the applier adds the wrapper - this file must NOT include it).
--   * Every statement idempotent (CREATE OR REPLACE) so a partial
--     application is safe to resume.
--   * Main project only (supabase/migrations/). Never cross-apply to Test.
--   * NOT applied yet - files only. After applying: regenerate
--     supabase/schema.sql and re-run the verification queries below.

-- ─────────────────────────────────────────────────────────────────────────────
-- S-M1 (MEDIUM): enforce_member_self_update early-return bypass.
-- The trigger returned NEW early whenever ANY allowed field (id/name/address/
-- phone) changed, so the protected-field check below it never ran in that
-- case: UPDATE members SET address = address || ' ', monthly_pledge = 0
-- WHERE id = <own> passed via PostgREST. RLS members_update_own has no column
-- restrictions, so this trigger is the only guard.
-- Fix: check protected fields FIRST and raise 42501 on any change; otherwise
-- RETURN NEW. The allowed-field allowlist is dropped - everything except the
-- four protected fields is permitted, which is exactly the documented intent
-- (BUG-042). SECURITY DEFINER + SET search_path = 'public' preserved from the
-- live definition; service_role and admin/treasurer bypasses unchanged.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_member_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token_role TEXT := COALESCE(auth.jwt() ->> 'role', 'anon');
  v_role TEXT;
BEGIN
  IF v_token_role = 'service_role' THEN RETURN NEW; END IF;
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  IF v_role IN ('admin', 'treasurer') THEN RETURN NEW; END IF;
  IF NEW.monthly_pledge IS DISTINCT FROM OLD.monthly_pledge
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.join_date IS DISTINCT FROM OLD.join_date
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'self-service profile updates may only change name, address or phone'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- S-M2 (MEDIUM): admin_delete_user 409s on FK constraints.
-- The RPC nulled donations.created_by/collected_by but member_pledge_history,
-- payment_allocations, expenses and notices all hold created_by FKs to
-- auth.users(id) with no ON DELETE action, so deleting any staff with history
-- rolled back (BUG-043).
-- Fix: null created_by on the four tables before the delete, mirroring the
-- existing donations pattern. (public.users cascades via users_id_fkey;
-- self-delete is blocked so zero-admin is unreachable.) Everything else in
-- the function is byte-identical to the live definition, including
-- SET search_path TO 'public', 'auth'.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  IF get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'নিজের অ্যাকাউন্ট মুছে ফেলা যাবে না';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.donations SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE public.donations SET collected_by = NULL WHERE collected_by = target_user_id;
  UPDATE public.member_pledge_history SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE public.payment_allocations SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE public.expenses SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE public.notices SET created_by = NULL WHERE created_by = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$function$;

NOTIFY pgrst, 'reload schema';

-- Verification (run after apply):
--   * S-M1: protected-field check is first in the function body:
--     SELECT pg_get_functiondef('public.enforce_member_self_update()'::regprocedure);
--     -- expect: no early "RETURN NEW" before the monthly_pledge/status/
--     -- join_date/created_at IS DISTINCT FROM block; RAISE ... ERRCODE 42501.
--   * S-M1 trigger still attached:
--     SELECT tgname FROM pg_trigger WHERE tgname = 'trg_member_self_update'
--       AND NOT tgisinternal;  -- expect 1 row
--   * S-M2: null-out statements present:
--     SELECT pg_get_functiondef('public.admin_delete_user(uuid)'::regprocedure);
--     -- expect UPDATE ... SET created_by = NULL for member_pledge_history,
--     -- payment_allocations, expenses, notices before DELETE FROM auth.users.
--   * S-M2 end-to-end (needs a throwaway staff user with history; roll back):
--     BEGIN;
--     -- create temp user + a pledge-history row with created_by = temp id,
--     -- then SELECT public.admin_delete_user(temp_id);  -- must NOT raise 23503
--     ROLLBACK;
--   * Zero-sum invariant still holds:
--     SELECT (SELECT SUM(amount) FROM public.payment_allocations)
--          = (SELECT SUM(amount) FROM public.donations);  -- expect true
