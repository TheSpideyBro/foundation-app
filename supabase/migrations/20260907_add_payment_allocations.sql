-- payment_allocations: persistent allocation source of truth
-- allocation_type ∈ { 'pledge', 'advance', 'unallocated' }
-- payment_allocations are the single source of truth for monthly collected amounts.

-- 1. Add note column to donations if missing
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS note TEXT;

-- 2. Create payment_allocations table
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    payment_id UUID NOT NULL
        REFERENCES public.donations(id)
        ON DELETE CASCADE,

    member_id UUID NOT NULL
        REFERENCES public.members(id)
        ON DELETE CASCADE,

    month TEXT,

    amount NUMERIC NOT NULL
        CHECK (amount >= 0),

    allocation_type TEXT NOT NULL
        CHECK (
            allocation_type IN (
                'pledge',
                'advance',
                'unallocated'
            )
        ),

    note TEXT,

    created_by UUID
        REFERENCES auth.users(id),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment
    ON public.payment_allocations(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_member_month
    ON public.payment_allocations(member_id, month);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_month
    ON public.payment_allocations(month);

-- 4. Unique constraint: one allocation per (payment, month, type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_payment_allocations_payment_month_type'
    ) THEN
        ALTER TABLE public.payment_allocations
            ADD CONSTRAINT uq_payment_allocations_payment_month_type
            UNIQUE (payment_id, month, allocation_type);
    END IF;
END
$$;

-- 5. RLS
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_allocations_select_staff" ON public.payment_allocations;
DROP POLICY IF EXISTS "payment_allocations_insert_staff" ON public.payment_allocations;
DROP POLICY IF EXISTS "payment_allocations_delete_admin" ON public.payment_allocations;

CREATE POLICY "payment_allocations_select_staff"
    ON public.payment_allocations FOR SELECT
    USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));

CREATE POLICY "payment_allocations_insert_staff"
    ON public.payment_allocations FOR INSERT
    WITH CHECK (get_my_role() = ANY (ARRAY['admin', 'treasurer']));

CREATE POLICY "payment_allocations_delete_admin"
    ON public.payment_allocations FOR DELETE
    USING (get_my_role() = 'admin');

GRANT SELECT, INSERT ON public.payment_allocations TO authenticated;

-- 6. Audit trigger
DROP TRIGGER IF EXISTS audit_payment_allocations ON public.payment_allocations;
CREATE TRIGGER audit_payment_allocations
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 7. Allocation helper function
-- Calculates allocation rows for a single donation given its coverage range.
-- Returns a table of { month, amount, allocation_type } ready to insert.
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
        -- Resolve pledge from history JSONB or member fallback
        pledge_amount := 0;
        SELECT COALESCE(
            (SELECT (elem->>'monthly_amount')::numeric
             FROM jsonb_array_elements(p_pledge_history) elem
             WHERE elem->>'effective_from_month' <= month_cursor
             ORDER BY elem->>'effective_from_month' DESC
             LIMIT 1),
            0
        ) INTO pledge_amount;

        IF pledge_amount IS NULL THEN pledge_amount := 0; END IF;

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

-- 8. Atomic payment insertion function
-- Inserts donation + allocations + optional pledge history change in one transaction.
CREATE OR REPLACE FUNCTION public.save_payment_entry(
    p_member_id UUID,
    p_amount NUMERIC,
    p_date DATE,
    p_method TEXT,
    p_receipt_no TEXT,
    p_coverage_start TEXT,
    p_coverage_end TEXT,
    p_collected_by UUID,
    p_note TEXT,
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

    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;

    -- Validate coverage range
    IF p_coverage_start IS NULL OR p_coverage_end IS NULL THEN
        RAISE EXCEPTION 'Coverage month range is required';
    END IF;

    -- Resolve pledge history for this member
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

    -- Insert donation
    INSERT INTO public.donations (
        member_id, amount, date, method, receipt_no,
        coverage_start_month, coverage_end_month, note,
        collected_by, created_by
    ) VALUES (
        p_member_id, p_amount, p_date, p_method, p_receipt_no,
        p_coverage_start, p_coverage_end, p_note,
        p_collected_by, v_actor_id
    ) RETURNING id INTO v_payment_id;

    -- Insert allocations via the helper function
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

    -- Optional pledge change
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

REVOKE ALL ON FUNCTION public.save_payment_entry FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_payment_entry TO authenticated;

-- 9. Reallocation function for editing existing payments
CREATE OR REPLACE FUNCTION public.reallocate_payment(
    p_payment_id UUID,
    p_amount NUMERIC,
    p_coverage_start TEXT,
    p_coverage_end TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_actor_id UUID;
    v_pledge_history JSONB;
    allocation RECORD;
BEGIN
    -- Get donor info
    SELECT member_id INTO v_member_id FROM public.donations WHERE id = p_payment_id;
    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    v_actor_id := auth.uid();

    -- Resolve pledge history
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

    -- Update donation amount and note
    UPDATE public.donations
    SET amount = p_amount, note = p_note
    WHERE id = p_payment_id;

    -- Delete old allocations
    DELETE FROM public.payment_allocations WHERE payment_id = p_payment_id;

    -- Recalculate and insert new allocations
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
$$;

REVOKE ALL ON FUNCTION public.reallocate_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reallocate_payment TO authenticated;

-- 10. Legacy backfill function (idempotent)
CREATE OR REPLACE FUNCTION public.backfill_payment_allocations()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    allocation RECORD;
    v_pledge_history JSONB;
BEGIN
    FOR r IN
        SELECT d.id AS payment_id, d.member_id, d.amount,
               d.coverage_start_month, d.coverage_end_month,
               d.donation_month, d.donation_end_month, d.note, d.created_by
        FROM public.donations d
        WHERE NOT EXISTS (
            SELECT 1 FROM public.payment_allocations pa WHERE pa.payment_id = d.id
        )
    LOOP
        -- Resolve pledge history for this member
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
            WHERE ph.member_id = r.member_id;
        EXCEPTION WHEN OTHERS THEN
            v_pledge_history := '[]'::jsonb;
        END;

        -- Use existing helper function
        FOR allocation IN
            SELECT * FROM public.calculate_payment_allocation(
                r.payment_id, r.member_id, r.amount,
                COALESCE(r.coverage_start_month, r.donation_month),
                COALESCE(r.coverage_end_month, r.donation_end_month, r.coverage_start_month, r.donation_month),
                v_pledge_history
            )
        LOOP
            INSERT INTO public.payment_allocations (
                payment_id, member_id, month, amount, allocation_type, note, created_by
            ) VALUES (
                r.payment_id, r.member_id, allocation.month, allocation.amount,
                allocation.allocation_type, r.note, r.created_by
            )
            ON CONFLICT (payment_id, month, allocation_type) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_payment_allocations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_payment_allocations() TO authenticated;

NOTIFY pgrst, 'reload schema';
