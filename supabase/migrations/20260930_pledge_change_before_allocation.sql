-- Supabase live-DB fixes - 2026-09-30 (Main project: mlnzxhuozuyidpxepxex)
-- Verified against the live catalog (supabase/schema.sql) before writing.
--
-- BUG-021 (HIGH) save_payment_entry() read member_pledge_history, inserted
--                the donation and ran calculate_payment_allocation() BEFORE
--                the DB-011 pledge block. A pledge change recorded on the
--                same entry therefore never influenced that entry's own
--                allocations: months on/after p_pledge_effective_month were
--                still priced at the OLD pledge, while member_pledge_history
--                immediately said the new amount was due. The Joma preview
--                modelled the same stale history, so both agreed on the
--                wrong number. The pledge block now runs first.
-- BUG-022 (MED)  No cap on the coverage window: monthRange() in
--                lib/payment-ledger.ts stops at 121 months while the SQL
--                engine loops the whole generate_series range, so a longer
--                window was previewed one way and stored another. Capped at
--                120 months here; app/api/payments/route.ts and the Joma
--                form enforce the same limit (AGENTS.md rule 1: one engine,
--                identical results).
-- BUG-023 (MED)  p_pledge_effective_month was neither format-checked nor
--                bounded. A backdated month silently restates months that
--                are already reported (ledger, monthly_collection_summary,
--                Reports), and a non-YYYY-MM value corrupts the string
--                comparisons in resolvePledgeForMonth(). Now required to be
--                YYYY-MM and not before the coverage window being paid.
--
-- Signature is unchanged, so existing callers, PostgREST and grants keep
-- working. No data is modified by this migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- BUG-021/022/023: apply the pledge change BEFORE allocating, guard the window
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_payment_entry(
  p_member_id UUID, p_amount NUMERIC, p_extra_amount NUMERIC DEFAULT 0,
  p_date DATE DEFAULT CURRENT_DATE, p_method TEXT DEFAULT 'cash', p_receipt_no TEXT DEFAULT NULL,
  p_coverage_start TEXT DEFAULT NULL, p_coverage_end TEXT DEFAULT NULL, p_collected_by UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL, p_pledge_change_amount NUMERIC DEFAULT NULL,
  p_pledge_effective_month TEXT DEFAULT NULL, p_pledge_change_note TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payment_id UUID; v_actor_id UUID; allocation RECORD; v_pledge_history JSONB; v_month_span INT;
BEGIN
  v_actor_id := auth.uid(); p_extra_amount := COALESCE(p_extra_amount, 0);
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF p_extra_amount < 0 THEN RAISE EXCEPTION 'Extra amount cannot be negative'; END IF;
  IF p_coverage_start IS NULL OR p_coverage_end IS NULL OR p_coverage_start > p_coverage_end THEN RAISE EXCEPTION 'Coverage month range is required'; END IF;
  -- BUG-022: the TS preview truncates past 121 months, this engine does not.
  IF p_coverage_start !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' OR p_coverage_end !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Coverage months must be YYYY-MM';
  END IF;
  v_month_span := (split_part(p_coverage_end, '-', 1)::INT - split_part(p_coverage_start, '-', 1)::INT) * 12
                + (split_part(p_coverage_end, '-', 2)::INT - split_part(p_coverage_start, '-', 2)::INT) + 1;
  IF v_month_span < 1 OR v_month_span > 120 THEN RAISE EXCEPTION 'Coverage range must be between 1 and 120 months'; END IF;
  -- BUG-023: a backdated effective month restates months that are reported.
  IF p_pledge_change_amount IS NOT NULL AND p_pledge_change_amount <= 0 THEN RAISE EXCEPTION 'Pledge amount must be positive'; END IF;
  IF p_pledge_change_amount IS NOT NULL AND p_pledge_effective_month IS NULL THEN RAISE EXCEPTION 'Pledge effective month is required'; END IF;
  IF p_pledge_change_amount IS NOT NULL AND p_pledge_effective_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Pledge effective month must be YYYY-MM'; END IF;
  IF p_pledge_change_amount IS NOT NULL AND p_pledge_effective_month < p_coverage_start THEN RAISE EXCEPTION 'Pledge effective month cannot be before the coverage start month'; END IF;

  -- BUG-021: the pledge change lands FIRST, so the history read below already
  -- contains it and months on/after the effective month are priced at the new
  -- amount. members.monthly_pledge is updated too because the engine falls
  -- back to it for any month with no history row.
  IF p_pledge_change_amount IS NOT NULL THEN
    UPDATE public.members SET monthly_pledge = p_pledge_change_amount WHERE id = p_member_id;
    INSERT INTO public.member_pledge_history(member_id, monthly_amount, effective_from_month, note, created_by)
    VALUES (p_member_id, p_pledge_change_amount, p_pledge_effective_month, p_pledge_change_note, v_actor_id);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('member_id', ph.member_id, 'monthly_amount', ph.monthly_amount, 'effective_from_month', ph.effective_from_month)), '[]'::jsonb) INTO v_pledge_history FROM public.member_pledge_history ph WHERE ph.member_id = p_member_id;
  INSERT INTO public.donations(member_id, amount, extra_amount, date, method, receipt_no, coverage_start_month, coverage_end_month, note, collected_by, created_by) VALUES (p_member_id, p_amount + p_extra_amount, p_extra_amount, p_date, p_method, p_receipt_no, p_coverage_start, p_coverage_end, p_note, p_collected_by, v_actor_id) RETURNING id INTO v_payment_id;
  FOR allocation IN SELECT * FROM public.calculate_payment_allocation(v_payment_id, p_member_id, p_amount, p_coverage_start, p_coverage_end, v_pledge_history) LOOP
    INSERT INTO public.payment_allocations(payment_id, member_id, month, amount, allocation_type, note, created_by) VALUES (v_payment_id, p_member_id, allocation.month, allocation.amount, allocation.allocation_type, p_note, v_actor_id);
  END LOOP;
  IF p_extra_amount > 0 THEN INSERT INTO public.payment_allocations(payment_id, member_id, month, amount, allocation_type, note, created_by) VALUES (v_payment_id, p_member_id, NULL, p_extra_amount, 'unallocated', 'Extra amount', v_actor_id); END IF;
  RETURN v_payment_id;
END; $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- BUG-022: reallocation recomputes with the same engine, so it takes the same
-- window guards.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reallocate_payment(
  p_payment_id UUID, p_amount NUMERIC, p_extra_amount NUMERIC DEFAULT 0,
  p_coverage_start TEXT DEFAULT NULL, p_coverage_end TEXT DEFAULT NULL, p_note TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member_id UUID; v_actor_id UUID; v_pledge_history JSONB; allocation RECORD; v_month_span INT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF p_extra_amount IS NULL OR p_extra_amount < 0 THEN RAISE EXCEPTION 'Extra amount cannot be negative'; END IF;
  IF p_coverage_start IS NULL OR p_coverage_end IS NULL OR p_coverage_start > p_coverage_end THEN RAISE EXCEPTION 'Coverage month range is required'; END IF;
  IF p_coverage_start !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' OR p_coverage_end !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Coverage months must be YYYY-MM';
  END IF;
  v_month_span := (split_part(p_coverage_end, '-', 1)::INT - split_part(p_coverage_start, '-', 1)::INT) * 12
                + (split_part(p_coverage_end, '-', 2)::INT - split_part(p_coverage_start, '-', 2)::INT) + 1;
  IF v_month_span < 1 OR v_month_span > 120 THEN RAISE EXCEPTION 'Coverage range must be between 1 and 120 months'; END IF;

  SELECT member_id INTO v_member_id FROM public.donations WHERE id = p_payment_id FOR UPDATE;
  IF v_member_id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  v_actor_id := auth.uid();
  SELECT COALESCE(jsonb_agg(jsonb_build_object('member_id', ph.member_id, 'monthly_amount', ph.monthly_amount, 'effective_from_month', ph.effective_from_month)), '[]'::jsonb) INTO v_pledge_history FROM public.member_pledge_history ph WHERE ph.member_id = v_member_id;
  UPDATE public.donations SET amount = p_amount + p_extra_amount, extra_amount = p_extra_amount, coverage_start_month = p_coverage_start, coverage_end_month = p_coverage_end, note = p_note WHERE id = p_payment_id;
  DELETE FROM public.payment_allocations WHERE payment_id = p_payment_id;
  FOR allocation IN SELECT * FROM public.calculate_payment_allocation(p_payment_id, v_member_id, p_amount, p_coverage_start, p_coverage_end, v_pledge_history) LOOP
    INSERT INTO public.payment_allocations(payment_id, member_id, month, amount, allocation_type, note, created_by) VALUES (p_payment_id, v_member_id, allocation.month, allocation.amount, allocation.allocation_type, p_note, v_actor_id);
  END LOOP;
  IF p_extra_amount > 0 THEN INSERT INTO public.payment_allocations(payment_id, member_id, month, amount, allocation_type, note, created_by) VALUES (p_payment_id, v_member_id, NULL, p_extra_amount, 'unallocated', 'Extra amount', v_actor_id); END IF;
END; $$;

-- Server-only, as established by 20260929_harden_definer_rpcs.sql (DB-001).
-- CREATE OR REPLACE keeps existing ACLs; re-asserting makes the intent
-- explicit and is a no-op when the grants are already correct.
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.save_payment_entry(UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_object OR undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.reallocate_payment(UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
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

-- The invariant every allocation change must still hold (AGENTS.md): if it
-- does not, this transaction aborts and the function changes roll back with it.
DO $$
DECLARE v_alloc NUMERIC; v_don NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_alloc FROM public.payment_allocations;
  SELECT COALESCE(SUM(amount), 0) INTO v_don FROM public.donations;
  IF v_alloc <> v_don THEN
    RAISE EXCEPTION 'zero-sum invariant broken: payment_allocations=% donations=%', v_alloc, v_don;
  END IF;
  RAISE NOTICE 'zero-sum verified: % = %', v_alloc, v_don;
END $$;

NOTIFY pgrst, 'reload schema';
