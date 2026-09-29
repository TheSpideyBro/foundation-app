-- Supabase live-DB audit fixes - 2026-09-29
-- Verified against project mlnzxhuozuyidpxepxex (catalog introspection).
--
-- DB-001 (CRITICAL) save_payment_entry / reallocate_payment are SECURITY
--                DEFINER with no authorization check and EXECUTE is granted
--                to anon AND authenticated. Any visitor (even signed out)
--                could insert/rewrite donations through PostgREST.
--                The app only ever calls them server-side with the
--                service-role client (app/api/payments/route.ts).
-- DB-002 (HIGH)  members_update_own is row-scoped, not column-scoped: a
--                member could rewrite their own monthly_pledge / status /
--                join_date through /profile (name/address/phone only).
-- DB-003 (MED)   generate_receipt_no() used max()+1 with no lock, and
--                lpad(x, 4, '0') TRUNCATES once the number exceeds 4 digits,
--                so every generated receipt after R-9999 collided with the
--                previous one (R-991783 -> "R-9917").
-- DB-006 (MED)   Summary views run as their owner (no security_invoker) and
--                SELECT was granted to anon: member_directory (names +
--                pledges), expense/donation totals were public.
-- DB-008 (LOW)   FK columns with no supporting index (donations.member_id is
--                the hot path for the member ledger).
-- DB-010 (MED)   No CHECK on users.role, is_approved nullable, pledge sign
--                unchecked.
-- DB-011 (HIGH)  save_payment_entry declared p_pledge_change_* arguments but
--                never used them: the Joma "change pledge" feature was
--                silently dropped (live body came from the 20260908 repair
--                migration, which omits the pledge block).

-- ─────────────────────────────────────────────────────────────────────────────
-- DB-011: persist pledge changes inside save_payment_entry
-- Body is the live definition plus the pledge block; signature unchanged so
-- existing callers/grants keep working.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_payment_entry(
  p_member_id UUID, p_amount NUMERIC, p_extra_amount NUMERIC DEFAULT 0,
  p_date DATE DEFAULT CURRENT_DATE, p_method TEXT DEFAULT 'cash', p_receipt_no TEXT DEFAULT NULL,
  p_coverage_start TEXT DEFAULT NULL, p_coverage_end TEXT DEFAULT NULL, p_collected_by UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL, p_pledge_change_amount NUMERIC DEFAULT NULL,
  p_pledge_effective_month TEXT DEFAULT NULL, p_pledge_change_note TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payment_id UUID; v_actor_id UUID; allocation RECORD; v_pledge_history JSONB;
BEGIN
  v_actor_id := auth.uid(); p_extra_amount := COALESCE(p_extra_amount, 0);
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF p_extra_amount < 0 THEN RAISE EXCEPTION 'Extra amount cannot be negative'; END IF;
  IF p_coverage_start IS NULL OR p_coverage_end IS NULL OR p_coverage_start > p_coverage_end THEN RAISE EXCEPTION 'Coverage month range is required'; END IF;
  IF p_pledge_change_amount IS NOT NULL AND p_pledge_change_amount <= 0 THEN RAISE EXCEPTION 'Pledge amount must be positive'; END IF;
  IF p_pledge_change_amount IS NOT NULL AND p_pledge_effective_month IS NULL THEN RAISE EXCEPTION 'Pledge effective month is required'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('member_id', ph.member_id, 'monthly_amount', ph.monthly_amount, 'effective_from_month', ph.effective_from_month)), '[]'::jsonb) INTO v_pledge_history FROM public.member_pledge_history ph WHERE ph.member_id = p_member_id;
  INSERT INTO public.donations(member_id, amount, extra_amount, date, method, receipt_no, coverage_start_month, coverage_end_month, note, collected_by, created_by) VALUES (p_member_id, p_amount + p_extra_amount, p_extra_amount, p_date, p_method, p_receipt_no, p_coverage_start, p_coverage_end, p_note, p_collected_by, v_actor_id) RETURNING id INTO v_payment_id;
  FOR allocation IN SELECT * FROM public.calculate_payment_allocation(v_payment_id, p_member_id, p_amount, p_coverage_start, p_coverage_end, v_pledge_history) LOOP
    INSERT INTO public.payment_allocations(payment_id, member_id, month, amount, allocation_type, note, created_by) VALUES (v_payment_id, p_member_id, allocation.month, allocation.amount, allocation.allocation_type, p_note, v_actor_id);
  END LOOP;
  IF p_extra_amount > 0 THEN INSERT INTO public.payment_allocations(payment_id, member_id, month, amount, allocation_type, note, created_by) VALUES (v_payment_id, p_member_id, NULL, p_extra_amount, 'unallocated', 'Extra amount', v_actor_id); END IF;
  -- DB-011: was missing on live - the pledge change was validated by the API
  -- and then thrown away. Mirror the /members page: current value + history.
  IF p_pledge_change_amount IS NOT NULL THEN
    UPDATE public.members SET monthly_pledge = p_pledge_change_amount WHERE id = p_member_id;
    INSERT INTO public.member_pledge_history(member_id, monthly_amount, effective_from_month, note, created_by)
    VALUES (p_member_id, p_pledge_change_amount, p_pledge_effective_month, p_pledge_change_note, v_actor_id);
  END IF;
  RETURN v_payment_id;
END; $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- DB-001: take the write RPCs away from client roles (server-only)
-- Wrapped so a signature that does not exist in an older environment cannot
-- abort the migration.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.save_payment_entry(UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.save_payment_entry(UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.reallocate_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.reallocate_payment(UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.backfill_payment_allocations() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.calculate_payment_allocation(UUID, UUID, NUMERIC, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
-- admin_delete_user keeps its internal admin check; anon must not reach it.
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC, anon;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.save_payment_entry(UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT) TO service_role;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.reallocate_payment(UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) TO service_role;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- DB-002: RLS cannot restrict columns, so enforce it in a trigger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_member_self_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'self-service profile updates may only change name, address or phone'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_member_self_update ON public.members;
CREATE TRIGGER trg_member_self_update BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_member_self_update();

-- ─────────────────────────────────────────────────────────────────────────────
-- DB-003: serialise receipt numbering and stop lpad() truncation
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_receipt_no()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  seq_num INTEGER;
  seq_text TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('public.donations.receipt_no'));
  SELECT coalesce(max(cast(nullif(regexp_replace(receipt_no, '[^0-9]', '', 'g'), '') as integer)), 0) + 1
  INTO seq_num FROM public.donations WHERE receipt_no ~ '^R-[0-9]+$';
  seq_text := seq_num::text;
  -- lpad() truncates on the right when the string is already longer than the
  -- target: '991783' -> '9917', which then collides on the UNIQUE index.
  IF length(seq_text) < 4 THEN seq_text := lpad(seq_text, 4, '0'); END IF;
  RETURN 'R-' || seq_text;
END; $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- DB-006: summary views are only ever read by signed-in users
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN REVOKE SELECT ON public.member_directory FROM anon; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN REVOKE SELECT ON public.expense_summary FROM anon; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN REVOKE SELECT ON public.donation_summary FROM anon; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN REVOKE SELECT ON public.member_summary FROM anon; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN REVOKE SELECT ON public.monthly_collection_summary FROM anon; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN REVOKE SELECT ON public.expense_category_summary FROM anon; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN REVOKE SELECT ON public.notices FROM anon; EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- DB-010: integrity constraints (verified: 0 NULL is_approved, 0 NULL/negative
-- pledges on live, so these apply without a backfill step)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_valid;
ALTER TABLE public.users ADD CONSTRAINT users_role_valid CHECK (role IN ('member', 'treasurer', 'admin'));

UPDATE public.users SET is_approved = false WHERE is_approved IS NULL;
ALTER TABLE public.users ALTER COLUMN is_approved SET DEFAULT false;
ALTER TABLE public.users ALTER COLUMN is_approved SET NOT NULL;

UPDATE public.members SET monthly_pledge = 0 WHERE monthly_pledge IS NULL;
ALTER TABLE public.members ALTER COLUMN monthly_pledge SET DEFAULT 0;
ALTER TABLE public.members ALTER COLUMN monthly_pledge SET NOT NULL;
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_pledge_non_negative;
ALTER TABLE public.members ADD CONSTRAINT members_pledge_non_negative CHECK (monthly_pledge >= 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- DB-008: indexes for FK columns and hot filters
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON public.donations(member_id);
CREATE INDEX IF NOT EXISTS idx_donations_member_date ON public.donations(member_id, date);
CREATE INDEX IF NOT EXISTS idx_donations_date ON public.donations(date);
CREATE INDEX IF NOT EXISTS idx_donations_collected_by ON public.donations(collected_by);
CREATE INDEX IF NOT EXISTS idx_donations_created_by ON public.donations(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_users_member_id ON public.users(member_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at);

NOTIFY pgrst, 'reload schema';
