-- DB-012: legacy donations were never backfilled into payment_allocations.
--
-- 14 donations recorded before 2026-09-08 (receipts R-012 .. R-046, all
-- dated 2026-08-02 .. 2026-09-05) have zero rows in payment_allocations:
--
--   SELECT SUM(amount) FROM donations;           -- 7850
--   SELECT SUM(amount) FROM payment_allocations; -- 3300   (<- broken)
--
-- monthly_collection_summary reads ONLY payment_allocations, so ৳4,550 of
-- real August/September cash never appeared in Reports or on the Dashboard,
-- and the documented zero-sum invariant (AGENTS.md, ADR-002) did not hold.
--
-- Root cause: `backfill_payment_allocations()` was defined in
-- 20260907_add_payment_allocations.sql but is MISSING from the live project,
-- so the migration's own "run the backfill afterwards" instruction was never
-- followed for these rows.
--
-- This migration is idempotent and transactional (apply with BEGIN/COMMIT):
--   1. restore backfill_payment_allocations() (service_role only)
--   2. pin coverage months on legacy rows so /donations, the summary view and
--      the allocation engine all agree on the month
--   3. run the backfill (only touches donations with zero allocations)
--   4. assert the zero-sum invariant, failing the transaction if it breaks

-- 1. Restore the documented backfill function, missing on live (DB-004).
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
        SELECT COALESCE(jsonb_agg(
                   jsonb_build_object(
                       'member_id', ph.member_id,
                       'monthly_amount', ph.monthly_amount,
                       'effective_from_month', ph.effective_from_month
                   ) ORDER BY ph.effective_from_month
               ), '[]'::jsonb)
        INTO v_pledge_history
        FROM public.member_pledge_history ph
        WHERE ph.member_id = r.member_id;

        FOR allocation IN
            SELECT * FROM public.calculate_payment_allocation(
                r.payment_id, r.member_id, r.amount,
                COALESCE(r.coverage_start_month, r.donation_month,
                         to_char((SELECT date FROM public.donations WHERE id = r.payment_id), 'YYYY-MM')),
                COALESCE(r.coverage_end_month, r.donation_end_month,
                         r.coverage_start_month, r.donation_month,
                         to_char((SELECT date FROM public.donations WHERE id = r.payment_id), 'YYYY-MM')),
                v_pledge_history
            )
        LOOP
            INSERT INTO public.payment_allocations (
                payment_id, member_id, month, amount, allocation_type, note, created_by
            ) VALUES (
                r.payment_id, r.member_id, allocation.month, allocation.amount,
                allocation.allocation_type, r.note, r.created_by
            );
        END LOOP;
    END LOOP;
END;
$$;

-- Financial rewrite tool: server-side (service role) only, never a client RPC.
REVOKE ALL ON FUNCTION public.backfill_payment_allocations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_payment_allocations() TO service_role;

-- 2. Pin coverage months on the unbackfilled legacy rows. The rule mirrors
--    app/donations/page.tsx coverageStart(): explicit coverage columns first,
--    then donation_month, then the payment date's month — so the page keeps
--    showing these donations in exactly the month it already labels them with.
UPDATE public.donations d
SET coverage_start_month = COALESCE(d.donation_month, to_char(d.date, 'YYYY-MM')),
    coverage_end_month   = COALESCE(d.donation_end_month, d.donation_month,
                                    to_char(d.date, 'YYYY-MM'))
WHERE d.coverage_start_month IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.payment_allocations pa WHERE pa.payment_id = d.id);

-- 3. Regenerate allocations for every donation that still has none.
SELECT public.backfill_payment_allocations();

-- 4. Fail the whole transaction if the invariant is still broken.
DO $$
DECLARE
    v_donations NUMERIC;
    v_allocations NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_donations FROM public.donations;
    SELECT COALESCE(SUM(amount), 0) INTO v_allocations FROM public.payment_allocations;
    IF v_donations <> v_allocations THEN
        RAISE EXCEPTION 'zero-sum invariant broken: donations=%, payment_allocations=%',
            v_donations, v_allocations;
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
