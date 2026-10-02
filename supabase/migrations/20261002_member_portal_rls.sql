-- F1 member self-service portal ("আমার হিসাব") - RLS for own-row reads.
-- Lets a logged-in member (users.member_id = members.id) read the rows the
-- portal needs to build their own ledger client-side with the canonical
-- lib/payment-ledger.ts functions:
--   * payment_allocations (own member_id) -> month-by-month paid amounts
--   * member_pledge_history (own member_id) -> effective pledge per month
-- members + donations already have members_select_own / donations_select_own.
-- Additive policies (OR-ed with the staff ones); no SECURITY DEFINER RPC, so
-- the ledger is always computed by the canonical engine, never a SQL copy.
--
-- Conventions (AGENTS.md / docs/database/MIGRATIONS.md):
--   * Applied via the management API wrapped in BEGIN; ... COMMIT;
--     (the applier adds the wrapper - this file must NOT include it).
--   * Every statement idempotent (DROP IF EXISTS + CREATE) so a partial
--     application is safe to resume.
--   * Main project only (supabase/migrations/). Never cross-apply to Test.
--   * NOT applied yet - files only. After applying: regenerate
--     supabase/schema.sql and re-run the verification queries below.

DROP POLICY IF EXISTS "payment_allocations_select_own" ON public.payment_allocations;
CREATE POLICY "payment_allocations_select_own" ON public.payment_allocations
  FOR SELECT TO PUBLIC
  USING (member_id = get_my_member_id());

DROP POLICY IF EXISTS "pledge_history_select_own" ON public.member_pledge_history;
CREATE POLICY "pledge_history_select_own" ON public.member_pledge_history
  FOR SELECT TO PUBLIC
  USING (member_id = get_my_member_id());

NOTIFY pgrst, 'reload schema';

-- Verification (run after apply):
--   SELECT policyname FROM pg_policies
--    WHERE schemaname = 'public'
--      AND tablename IN ('payment_allocations', 'member_pledge_history')
--      AND policyname LIKE '%_select_own'
--    ORDER BY 1;
--   -- expect 2 rows: payment_allocations_select_own, pledge_history_select_own
