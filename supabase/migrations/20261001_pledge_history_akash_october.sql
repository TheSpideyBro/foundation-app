-- BUG-031 (data half): "সাদ্দাম হোসেন আকাশ"'s current pledge and his pledge
-- history disagreed, so the ledger charged ৳1,000 while every label said ৳100.
--
-- member a40ef6db-2d31-4a79-bf31-30eb03c8e6c9 (Main):
--   2026-08 → ৳100    inserted 2026-09-15
--   2026-09 → ৳1000   inserted 2026-09-08
--   members.monthly_pledge = ৳100
--
-- The engine rule (ADR-001) is "latest applicable history entry
-- (effective_from_month <= month) → members.monthly_pledge → 0", so
-- September onward resolved to ৳1000 (the 2026-09 row wins) while the newer
-- ৳100 change only ever covered August — and members.monthly_pledge had been
-- overwritten to ৳100 by that same save.
--
-- Operator confirmed 2026-10-01: September stays ৳1000, October onward is
-- ৳100. This adds the missing effective-month row. It changes NO existing
-- history row, NO donation and NO allocation — only what the ledger will
-- expect from October onward.
--
-- Apply with BEGIN/COMMIT (scripts/dump-supabase-schema.py style wrapper:
-- python3 /tmp/opencode/apply-sql.py <this file> mlnzxhuozuyidpxepxex).
-- Idempotent: the row is inserted only when no 2026-10 row exists.

-- 1. The row that makes October onward ৳100.
INSERT INTO public.member_pledge_history (member_id, monthly_amount, effective_from_month, note)
SELECT 'a40ef6db-2d31-4a79-bf31-30eb03c8e6c9', 100, '2026-10',
       'অক্টোবর থেকে ৳১০০ — অপারেটর নিশ্চিতকরণ ২০২৬-১০-০১ (BUG-031)'
WHERE NOT EXISTS (
  SELECT 1 FROM public.member_pledge_history
   WHERE member_id = 'a40ef6db-2d31-4a79-bf31-30eb03c8e6c9'
     AND effective_from_month = '2026-10'
);

-- 2. Assert the resolution for both months exactly the way
--    resolvePledgeForMonth() (TS) and calculate_payment_allocation() (SQL)
--    read it: latest history row with effective_from_month <= month.
DO $$
DECLARE
  v_sep NUMERIC;
  v_oct NUMERIC;
BEGIN
  SELECT monthly_amount INTO v_sep
    FROM public.member_pledge_history
   WHERE member_id = 'a40ef6db-2d31-4a79-bf31-30eb03c8e6c9'
     AND effective_from_month <= '2026-09'
   ORDER BY effective_from_month DESC
   LIMIT 1;

  SELECT monthly_amount INTO v_oct
    FROM public.member_pledge_history
   WHERE member_id = 'a40ef6db-2d31-4a79-bf31-30eb03c8e6c9'
     AND effective_from_month <= '2026-10'
   ORDER BY effective_from_month DESC
   LIMIT 1;

  IF v_sep IS DISTINCT FROM 1000 THEN
    RAISE EXCEPTION 'BUG-031: 2026-09 resolves to %, expected 1000', v_sep;
  END IF;
  IF v_oct IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'BUG-031: 2026-10 resolves to %, expected 100', v_oct;
  END IF;
END $$;

-- 3. members.monthly_pledge is the fallback for months with no history row, so
--    it must agree with the newest effective row or the labels drift again
--    (BUG-031). Asserted, not updated: the app's own save path owns that field.
DO $$
DECLARE
  v_current NUMERIC;
BEGIN
  SELECT monthly_pledge INTO v_current
    FROM public.members
   WHERE id = 'a40ef6db-2d31-4a79-bf31-30eb03c8e6c9';

  IF v_current IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'BUG-031: members.monthly_pledge is %, expected 100', v_current;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
