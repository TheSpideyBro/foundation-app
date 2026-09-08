-- High-priority Joma Entry fix: persist extra cash separately from monthly allocation.
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS extra_amount NUMERIC NOT NULL DEFAULT 0
  CHECK (extra_amount >= 0);

CREATE OR REPLACE FUNCTION public.save_payment_entry(
    p_member_id UUID,
    p_amount NUMERIC,
    p_extra_amount NUMERIC DEFAULT 0,
    p_date DATE DEFAULT CURRENT_DATE,
    p_method TEXT DEFAULT 'cash',
    p_receipt_no TEXT DEFAULT NULL,
    p_coverage_start TEXT DEFAULT NULL,
    p_coverage_end TEXT DEFAULT NULL,
    p_collected_by UUID DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_pledge_change_amount NUMERIC DEFAULT NULL,
    p_pledge_effective_month TEXT DEFAULT NULL,
    p_pledge_change_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_id UUID;
    v_actor_id UUID;
    allocation RECORD;
    v_pledge_history JSONB;
BEGIN
    v_actor_id := auth.uid();
    p_extra_amount := COALESCE(p_extra_amount, 0);

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;
    IF p_extra_amount < 0 THEN
        RAISE EXCEPTION 'Extra amount cannot be negative';
    END IF;
    IF p_coverage_start IS NULL OR p_coverage_end IS NULL THEN
        RAISE EXCEPTION 'Coverage month range is required';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'member_id', ph.member_id,
        'monthly_amount', ph.monthly_amount,
        'effective_from_month', ph.effective_from_month
    )), '[]'::jsonb)
    INTO v_pledge_history
    FROM public.member_pledge_history ph
    WHERE ph.member_id = p_member_id;

    INSERT INTO public.donations (
        member_id, amount, extra_amount, date, method, receipt_no,
        coverage_start_month, coverage_end_month, note,
        collected_by, created_by
    ) VALUES (
        p_member_id, p_amount + p_extra_amount, p_extra_amount, p_date,
        p_method, p_receipt_no, p_coverage_start, p_coverage_end, p_note,
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

    IF p_extra_amount > 0 THEN
        INSERT INTO public.payment_allocations (
            payment_id, member_id, month, amount, allocation_type, note, created_by
        ) VALUES (
            v_payment_id, p_member_id, NULL, p_extra_amount,
            'unallocated', COALESCE(p_note, 'Extra amount'), v_actor_id
        );
    END IF;

    IF p_pledge_change_amount IS NOT NULL AND p_pledge_effective_month IS NOT NULL THEN
        INSERT INTO public.member_pledge_history (
            member_id, monthly_amount, effective_from_month, note, created_by
        ) VALUES (
            p_member_id, p_pledge_change_amount, p_pledge_effective_month,
            p_pledge_change_note, v_actor_id
        );
    END IF;

    RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_payment_entry(UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_payment_entry(UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
