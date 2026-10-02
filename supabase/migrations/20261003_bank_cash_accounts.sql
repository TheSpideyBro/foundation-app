-- Bank/Cash হিসাব (accounts) — foundation-er bank account o cash-in-hand track kora.
-- Excel-er "Bank Statement & Summary" sheet-er digital version.
--
-- Design:
--   * `accounts`: bank/cash account list (name, type, opening_balance).
--   * `account_transactions`: protita joma (in) / khoroch (out) entry.
--   * Transfer = paired out+in rows with the same transfer_id.
--   * Balance = opening_balance + sum(in) - sum(out), via account_balances view.
--
-- Conventions (AGENTS.md / docs/database/MIGRATIONS.md):
--   * Applied via the management API wrapped in BEGIN; ... COMMIT;
--     (the applier adds the wrapper - this file must NOT include it).
--   * Every statement idempotent so a partial application is safe to resume.
--   * Main project only (supabase/migrations/). Never cross-apply to Test.
--   * NOT applied yet - files only. After applying: regenerate
--     supabase/schema.sql and re-run the verification queries below.

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('bank', 'cash')),
  opening_balance numeric NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  amount numeric NOT NULL CHECK (amount > 0),
  particulars text NOT NULL,
  remarks text,
  transfer_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_transactions_account
  ON public.account_transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_date
  ON public.account_transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_account_transactions_transfer
  ON public.account_transactions (transfer_id) WHERE transfer_id IS NOT NULL;

-- Balance view: opening + in - out per account.
CREATE OR REPLACE VIEW public.account_balances AS
SELECT
  a.id,
  a.name,
  a.type,
  a.opening_balance,
  a.is_active,
  a.opening_balance
    + COALESCE(SUM(CASE WHEN t.direction = 'in' THEN t.amount ELSE -t.amount END), 0)
    AS current_balance,
  COUNT(t.id) AS transaction_count
FROM public.accounts a
LEFT JOIN public.account_transactions t ON t.account_id = a.id
GROUP BY a.id;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

-- Staff (admin/treasurer) can view accounts.
DROP POLICY IF EXISTS "accounts_select_staff" ON public.accounts;
CREATE POLICY "accounts_select_staff" ON public.accounts
  FOR SELECT TO PUBLIC
  USING (get_my_role() IN ('admin', 'treasurer'));

-- Admin/treasurer can create/update accounts.
DROP POLICY IF EXISTS "accounts_manage_staff" ON public.accounts;
CREATE POLICY "accounts_manage_staff" ON public.accounts
  FOR ALL TO PUBLIC
  USING (get_my_role() IN ('admin', 'treasurer'))
  WITH CHECK (get_my_role() IN ('admin', 'treasurer'));

-- Staff can view transactions.
DROP POLICY IF EXISTS "account_transactions_select_staff" ON public.account_transactions;
CREATE POLICY "account_transactions_select_staff" ON public.account_transactions
  FOR SELECT TO PUBLIC
  USING (get_my_role() IN ('admin', 'treasurer'));

-- Admin/treasurer can insert transactions (no update/delete via app - audit trail).
DROP POLICY IF EXISTS "account_transactions_insert_staff" ON public.account_transactions;
CREATE POLICY "account_transactions_insert_staff" ON public.account_transactions
  FOR INSERT TO PUBLIC
  WITH CHECK (get_my_role() IN ('admin', 'treasurer'));

NOTIFY pgrst, 'reload schema';

-- Verification (run after apply):
--   SELECT policyname, cmd FROM pg_policies WHERE schemaname='public'
--     AND tablename IN ('accounts', 'account_transactions') ORDER BY 1;
--   -- expect 4 rows
--   SELECT * FROM public.account_balances;
