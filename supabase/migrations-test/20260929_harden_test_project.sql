-- Test-project hardening: applies ONLY to pvfdgrdvvoytsfmjyvde
-- ("Daulkhar Foundation Test").
--
-- Never run this file against mlnzxhuozuyidpxepxex ("Daulkhar Foundation
-- Main"): Test's save_payment_entry() and reallocate_payment() have different
-- argument lists than Main's, so replaying this file on Main would CREATE
-- duplicate overloads and break PostgREST with ambiguous RPC resolution.
--
-- Mirrors supabase/migrations/20260929_harden_handle_new_user_role.sql and
-- 20260929_harden_definer_rpcs.sql, adjusted to the Test catalog:
--   * handle_new_user() trusts raw_user_meta_data  (BUG-012 / DB-002)
--   * save_payment_entry / reallocate_payment / backfill_payment_allocations
--     are SECURITY DEFINER with no auth check AND executable by anon
--     (DB-001 - worse on Test than Main, which had only anon+authenticated)
--   * admin_delete_user / calculate_payment_allocation executable by anon
--   * 7 views readable by anon, including audit_log_view (DB-006)
--   * generate_receipt_no() has no lock and lpad() truncation (DB-003)
--   * members_update_own with no column guard (DB-002)
--   * users.role has no CHECK, users.is_approved and members.monthly_pledge
--     are nullable (DB-010)
--   * missing FK indexes (DB-008)
--   * save_payment_entry() writes member_pledge_history but never updates
--     members.monthly_pledge, so the current pledge goes stale (DB-011 variant)
--   * reallocate_payment() recomputes allocations for the new coverage window
--     but never stores that window on donations (DB-011 variant)

-- ============================================================
-- BUG-012: never trust client-supplied auth metadata
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone, role, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone',
    'member',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DB-001: write RPCs become service_role-only
-- ============================================================
DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.save_payment_entry(uuid, numeric, date, text, text, text, text, uuid, text, numeric, text, text) FROM PUBLIC, anon, authenticated';
EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.reallocate_payment(uuid, numeric, text, text, text) FROM PUBLIC, anon, authenticated';
EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.backfill_payment_allocations() FROM PUBLIC, anon, authenticated';
EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
END $$;

-- Read-only calculator + the guarded admin helper: anon must not reach them;
-- authenticated keeps admin_delete_user (app calls it through requireAuth).
DO $$
BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.calculate_payment_allocation(uuid, uuid, numeric, text, text, jsonb) FROM PUBLIC, anon';
EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon';
EXCEPTION WHEN undefined_function OR undefined_object THEN NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.save_payment_entry(uuid, numeric, date, text, text, text, text, uuid, text, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reallocate_payment(uuid, numeric, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_payment_allocations() TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_payment_allocation(uuid, uuid, numeric, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated, service_role;

-- ============================================================
-- DB-011: pledge change must reach members.monthly_pledge
-- ============================================================
CREATE OR REPLACE FUNCTION public.save_payment_entry(
    p_member_id uuid,
    p_amount numeric,
    p_date date,
    p_method text,
    p_receipt_no text,
    p_coverage_start text,
    p_coverage_end text,
    p_collected_by uuid,
    p_note text,
    p_pledge_change_amount numeric DEFAULT NULL,
    p_pledge_effective_month text DEFAULT NULL,
    p_pledge_change_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_payment_id UUID;
    v_actor_id UUID;
    allocation RECORD;
    v_pledge_history JSONB;
BEGIN
    v_actor_id := auth.uid();

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;

    IF p_coverage_start IS NULL OR p_coverage_end IS NULL THEN
        RAISE EXCEPTION 'Coverage month range is required';
    END IF;

    BEGIN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'member_id', ph.member_id,
                'monthly_amount', ph.monthly_amount,
                'effective_from_month', ph.effective_from_month
            )
        ), '[]'::jsonb)
        INTO v_pledge_history
        FROM public.member_pledge_history ph
        WHERE ph.member_id = p_member_id;
    EXCEPTION WHEN OTHERS THEN
        v_pledge_history := '[]'::jsonb;
    END;

    INSERT INTO public.donations (
        member_id, amount, date, method, receipt_no,
        coverage_start_month, coverage_end_month, note,
        collected_by, created_by
    ) VALUES (
        p_member_id, p_amount, p_date, p_method, p_receipt_no,
        p_coverage_start, p_coverage_end, p_note,
        p_collected_by, v_actor_id
    ) RETURNING id INTO v_payment_id;

    FOR allocation IN
        SELECT * FROM public.calculate_payment_allocation(
            v_payment_id, p_member_id, p_amount,
            p_coverage_start, p_coverage_end, v_pledge_history
        )
    LOOP
        INSERT INTO public.payment_allocations (
            payment_id, member_id, month, amount, allocation_type, note, created_by
        ) VALUES (
            v_payment_id, p_member_id, allocation.month, allocation.amount,
            allocation.allocation_type, p_note, v_actor_id
        );
    END LOOP;

    IF p_pledge_change_amount IS NOT NULL AND p_pledge_effective_month IS NOT NULL THEN
        -- Current value AND history: before this, only the history row was
        -- written, so /members kept showing the old pledge.
        UPDATE public.members
        SET monthly_pledge = p_pledge_change_amount
        WHERE id = p_member_id;

        INSERT INTO public.member_pledge_history (
            member_id, monthly_amount, effective_from_month, note, created_by
        ) VALUES (
            p_member_id, p_pledge_change_amount, p_pledge_effective_month,
            p_pledge_change_note, v_actor_id
        );
    END IF;

    RETURN v_payment_id;
END;
$function$;

-- ============================================================
-- DB-011: reallocation must persist the coverage window it used
-- ============================================================
CREATE OR REPLACE FUNCTION public.reallocate_payment(
    p_payment_id uuid,
    p_amount numeric,
    p_coverage_start text,
    p_coverage_end text,
    p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_member_id UUID;
    v_actor_id UUID;
    v_pledge_history JSONB;
    allocation RECORD;
BEGIN
    SELECT member_id INTO v_member_id FROM public.donations WHERE id = p_payment_id;
    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    v_actor_id := auth.uid();

    BEGIN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'member_id', ph.member_id,
                'monthly_amount', ph.monthly_amount,
                'effective_from_month', ph.effective_from_month
            )
        ), '[]'::jsonb)
        INTO v_pledge_history
        FROM public.member_pledge_history ph
        WHERE ph.member_id = v_member_id;
    EXCEPTION WHEN OTHERS THEN
        v_pledge_history := '[]'::jsonb;
    END;

    UPDATE public.donations
    SET amount = p_amount,
        coverage_start_month = p_coverage_start,
        coverage_end_month = p_coverage_end,
        note = p_note
    WHERE id = p_payment_id;

    DELETE FROM public.payment_allocations WHERE payment_id = p_payment_id;

    FOR allocation IN
        SELECT * FROM public.calculate_payment_allocation(
            p_payment_id, v_member_id, p_amount,
            p_coverage_start, p_coverage_end, v_pledge_history
        )
    LOOP
        INSERT INTO public.payment_allocations (
            payment_id, member_id, month, amount, allocation_type, note, created_by
        ) VALUES (
            p_payment_id, v_member_id, allocation.month, allocation.amount,
            allocation.allocation_type, p_note, v_actor_id
        );
    END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_payment_entry(uuid, numeric, date, text, text, text, text, uuid, text, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reallocate_payment(uuid, numeric, text, text, text) TO service_role;

-- ============================================================
-- DB-003: receipt numbers - take a lock, never truncate
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_receipt_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  seq_num INTEGER;
  seq_text TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('public.donations.receipt_no'));
  SELECT coalesce(max(cast(nullif(regexp_replace(receipt_no, '[^0-9]', '', 'g'), '') as integer)), 0) + 1
  INTO seq_num FROM public.donations WHERE receipt_no ~ '^R-[0-9]+$';
  seq_text := seq_num::text;
  -- lpad() truncates on the right once the number is longer than 4 digits
  -- ('991783' -> '9917'), which then collides on donations_receipt_no_key.
  IF length(seq_text) < 4 THEN seq_text := lpad(seq_text, 4, '0'); END IF;
  RETURN 'R-' || seq_text;
END;
$function$;

-- ============================================================
-- DB-006: no anon SELECT on any view (audit_log_view leaks the audit trail)
-- ============================================================
DO $$
DECLARE v RECORD;
BEGIN
  FOR v IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
  LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', v.relname);
  END LOOP;
END $$;

-- ============================================================
-- DB-002: self-service member updates may only touch profile columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_member_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_token_role TEXT := COALESCE(auth.jwt() ->> 'role', 'anon');
  v_role TEXT;
BEGIN
  IF v_token_role = 'service_role' THEN RETURN NEW; END IF;
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  IF v_role IN ('admin', 'treasurer') THEN RETURN NEW; END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.name IS DISTINCT FROM OLD.name
     OR NEW.address IS DISTINCT FROM OLD.address
     OR NEW.phone IS DISTINCT FROM OLD.phone THEN
    RETURN NEW;
  END IF;

  IF NEW.monthly_pledge IS DISTINCT FROM OLD.monthly_pledge
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.join_date IS DISTINCT FROM OLD.join_date
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'self-service profile updates may only change name, address or phone'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_member_self_update ON public.members;
CREATE TRIGGER trg_member_self_update
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_member_self_update();

-- ============================================================
-- DB-010: nullability + role CHECK
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_valid' AND connamespace = 'public'::regnamespace
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_valid;
  END IF;
  ALTER TABLE public.users ADD CONSTRAINT users_role_valid
    CHECK (role IN ('member', 'treasurer', 'admin'));
EXCEPTION WHEN check_violation THEN
  -- live rows hold a role outside the allowed set; leave data alone
  RAISE NOTICE 'users_role_valid skipped: non-standard role values present';
END $$;

ALTER TABLE public.users ALTER COLUMN is_approved SET DEFAULT false;
ALTER TABLE public.users ALTER COLUMN is_approved SET NOT NULL;
ALTER TABLE public.members ALTER COLUMN monthly_pledge SET DEFAULT 0;
ALTER TABLE public.members ALTER COLUMN monthly_pledge SET NOT NULL;

-- ============================================================
-- DB-008: FK indexes Test was missing
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON public.donations (member_id);
CREATE INDEX IF NOT EXISTS idx_donations_collected_by ON public.donations (collected_by);
CREATE INDEX IF NOT EXISTS idx_donations_created_by ON public.donations (created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses (created_by);
CREATE INDEX IF NOT EXISTS idx_users_member_id ON public.users (member_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_member_pledge_history_created_by ON public.member_pledge_history (created_by);

NOTIFY pgrst, 'reload schema';
