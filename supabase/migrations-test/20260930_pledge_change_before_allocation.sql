-- Test-project fixes - 2026-09-30 (Test: pvfdgrdvvoytsfmjyvde)
--
-- Never run this file against mlnzxhuozuyidpxepxex ("Daulkhar Foundation
-- Main"): Test's save_payment_entry() and reallocate_payment() have different
-- argument lists than Main's (no p_extra_amount), so replaying this file on
-- Main would CREATE duplicate overloads and break PostgREST with ambiguous
-- RPC resolution (TD-011).
--
-- Same defects and same fixes as
-- supabase/migrations/20260930_pledge_change_before_allocation.sql, applied
-- to the Test function bodies:
--   * BUG-021 the pledge block ran AFTER calculate_payment_allocation(), so a
--     pledge change on the entry being saved never affected that entry.
--   * BUG-022 no cap on the coverage window (TS preview stops at 121 months,
--     this engine loops the whole range).
--   * BUG-023 p_pledge_effective_month was neither format-checked nor bounded,
--     so a backdated month restated months that are already reported.
--
-- No data is modified by this migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- BUG-021/022/023: pledge change first, then allocate; guard the window
-- ─────────────────────────────────────────────────────────────────────────────
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
    v_month_span INT;
BEGIN
    v_actor_id := auth.uid();

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;

    IF p_coverage_start IS NULL OR p_coverage_end IS NULL THEN
        RAISE EXCEPTION 'Coverage month range is required';
    END IF;
    IF p_coverage_start > p_coverage_end THEN
        RAISE EXCEPTION 'Coverage month range is required';
    END IF;
    -- BUG-022: the TS preview truncates past 121 months, this engine does not.
    IF p_coverage_start !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' OR p_coverage_end !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
        RAISE EXCEPTION 'Coverage months must be YYYY-MM';
    END IF;
    v_month_span := (split_part(p_coverage_end, '-', 1)::INT - split_part(p_coverage_start, '-', 1)::INT) * 12
                  + (split_part(p_coverage_end, '-', 2)::INT - split_part(p_coverage_start, '-', 2)::INT) + 1;
    IF v_month_span < 1 OR v_month_span > 120 THEN
        RAISE EXCEPTION 'Coverage range must be between 1 and 120 months';
    END IF;
    -- BUG-023: a backdated effective month restates months that are reported.
    IF p_pledge_change_amount IS NOT NULL AND p_pledge_change_amount <= 0 THEN
        RAISE EXCEPTION 'Pledge amount must be positive';
    END IF;
    IF p_pledge_change_amount IS NOT NULL AND p_pledge_effective_month IS NULL THEN
        RAISE EXCEPTION 'Pledge effective month is required';
    END IF;
    IF p_pledge_change_amount IS NOT NULL AND p_pledge_effective_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
        RAISE EXCEPTION 'Pledge effective month must be YYYY-MM';
    END IF;
    IF p_pledge_change_amount IS NOT NULL AND p_pledge_effective_month < p_coverage_start THEN
        RAISE EXCEPTION 'Pledge effective month cannot be before the coverage start month';
    END IF;

    -- BUG-021: the pledge change lands FIRST, so the history read below already
    -- contains it. members.monthly_pledge is updated too because the engine
    -- falls back to it for any month with no history row.
    IF p_pledge_change_amount IS NOT NULL AND p_pledge_effective_month IS NOT NULL THEN
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

    RETURN v_payment_id;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- BUG-022: reallocation recomputes with the same engine, so it takes the same
-- window guards.
-- ─────────────────────────────────────────────────────────────────────────────
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
    v_month_span INT;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;
    IF p_coverage_start IS NULL OR p_coverage_end IS NULL THEN
        RAISE EXCEPTION 'Coverage month range is required';
    END IF;
    IF p_coverage_start > p_coverage_end THEN
        RAISE EXCEPTION 'Coverage month range is required';
    END IF;
    IF p_coverage_start !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' OR p_coverage_end !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
        RAISE EXCEPTION 'Coverage months must be YYYY-MM';
    END IF;
    v_month_span := (split_part(p_coverage_end, '-', 1)::INT - split_part(p_coverage_start, '-', 1)::INT) * 12
                  + (split_part(p_coverage_end, '-', 2)::INT - split_part(p_coverage_start, '-', 2)::INT) + 1;
    IF v_month_span < 1 OR v_month_span > 120 THEN
        RAISE EXCEPTION 'Coverage range must be between 1 and 120 months';
    END IF;

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
