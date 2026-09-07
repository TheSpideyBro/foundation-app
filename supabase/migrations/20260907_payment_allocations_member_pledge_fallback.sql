-- Fix canonical algorithm drift: SQL calculate_payment_allocation must match
-- the TS engine (resolvePledgeForMonth), which falls back to the member's
-- monthly_pledge when no pledge-history entry applies.
--
-- Precedence (identical to lib/payment-ledger.ts:85-94):
--   latest applicable pledge-history entry
--     -> member.monthly_pledge (fallback)
--     -> 0
-- clamped to >= 0.
--
-- Only calculate_payment_allocation changes; save_payment_entry,
-- reallocate_payment, and backfill_payment_allocations all pass p_member_id
-- through to it, so they inherit the corrected algorithm automatically.
CREATE OR REPLACE FUNCTION public.calculate_payment_allocation(
    p_payment_id UUID,
    p_member_id UUID,
    p_payment_amount NUMERIC,
    p_coverage_start TEXT,
    p_coverage_end TEXT,
    p_pledge_history JSONB
)
RETURNS TABLE (month TEXT, amount NUMERIC, allocation_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    month_cursor TEXT;
    month_start DATE;
    month_end DATE;
    pledge_amount NUMERIC;
    remaining NUMERIC;
    allocated NUMERIC;
    entry JSONB;
BEGIN
    IF p_coverage_start IS NULL OR p_coverage_end IS NULL THEN
        RETURN;
    END IF;

    month_start := to_date(p_coverage_start, 'YYYY-MM');
    month_end := to_date(p_coverage_end, 'YYYY-MM');

    IF month_start IS NULL OR month_end IS NULL THEN
        RETURN;
    END IF;

    remaining := p_payment_amount;

    FOR month_cursor IN
        SELECT to_char(d, 'YYYY-MM')
        FROM generate_series(month_start, month_end, INTERVAL '1 month') d
    LOOP
        -- Canonical pledge resolution: latest applicable history entry,
        -- else member.monthly_pledge fallback, else 0. Clamp to >= 0.
        SELECT COALESCE(
            (SELECT (elem->>'monthly_amount')::numeric
             FROM jsonb_array_elements(p_pledge_history) elem
             WHERE elem->>'effective_from_month' <= month_cursor
             ORDER BY elem->>'effective_from_month' DESC
             LIMIT 1),
            (SELECT monthly_pledge::numeric FROM public.members WHERE id = p_member_id),
            0
        ) INTO pledge_amount;

        IF pledge_amount IS NULL THEN pledge_amount := 0; END IF;
        IF pledge_amount < 0 THEN pledge_amount := 0; END IF;

        allocated := LEAST(remaining, pledge_amount);
        remaining := remaining - allocated;

        IF allocated > 0 THEN
            allocation_type := 'pledge';
        ELSE
            allocation_type := 'unallocated';
        END IF;

        month := month_cursor;
        amount := allocated;
        RETURN NEXT;
    END LOOP;

    -- Final leftover goes to unallocated with NULL month
    IF remaining > 0 THEN
        month := NULL;
        amount := remaining;
        allocation_type := 'unallocated';
        RETURN NEXT;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_payment_allocation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_payment_allocation TO authenticated;

NOTIFY pgrst, 'reload schema';
