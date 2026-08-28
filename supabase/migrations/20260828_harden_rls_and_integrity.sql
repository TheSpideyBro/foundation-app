-- Harden Supabase access policies and integrity constraints.
-- Apply to both the test and production projects.

ALTER TABLE public.donations
  DROP CONSTRAINT IF EXISTS donations_amount_positive;
ALTER TABLE public.donations
  ADD CONSTRAINT donations_amount_positive CHECK (amount > 0);

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_amount_positive;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT COALESCE(role, 'member') FROM public.users WHERE id = auth.uid() LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_is_approved()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((SELECT is_approved FROM public.users WHERE id = auth.uid() LIMIT 1), false);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_member_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT member_id FROM public.users WHERE id = auth.uid() LIMIT 1);
END;
$$;

ALTER FUNCTION public.log_audit_event() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

DROP POLICY IF EXISTS "users_read_all" ON public.users;
DROP POLICY IF EXISTS "users_read_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "users_update_self_profile" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_read_self" ON public.users
  FOR SELECT USING (auth.uid() = id OR get_my_role() = 'admin');
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
CREATE POLICY "users_insert_self" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'member' AND is_approved = false AND member_id IS NULL);

CREATE POLICY "users_update_self_profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id OR get_my_role() = 'admin')
  WITH CHECK (
    get_my_role() = 'admin'
    OR (
      auth.uid() = id
      AND role = get_my_role()
      AND is_approved = get_my_is_approved()
      AND member_id IS NOT DISTINCT FROM get_my_member_id()
    )
  );
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "members_select_all" ON public.members;
DROP POLICY IF EXISTS "members_select_staff" ON public.members;
CREATE POLICY "members_select_staff" ON public.members
  FOR SELECT USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));
CREATE POLICY "members_select_own" ON public.members
  FOR SELECT USING (id = get_my_member_id());
CREATE POLICY "members_update_own" ON public.members
  FOR UPDATE
  USING (id = get_my_member_id())
  WITH CHECK (id = get_my_member_id());

DROP POLICY IF EXISTS "expenses_select_all" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_staff" ON public.expenses;
CREATE POLICY "expenses_select_staff" ON public.expenses
  FOR SELECT USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));

DROP POLICY IF EXISTS "audit_log_insert_system" ON public.audit_log;

DROP VIEW IF EXISTS public.member_directory;
CREATE VIEW public.member_directory AS
  SELECT id, name, join_date, status, monthly_pledge, created_at
  FROM public.members;
GRANT SELECT ON public.member_directory TO authenticated;

DROP VIEW IF EXISTS public.expense_summary;
CREATE VIEW public.expense_summary AS
  SELECT COALESCE(SUM(amount), 0)::numeric AS total_amount,
         COUNT(*)::bigint AS expense_count
  FROM public.expenses;
GRANT SELECT ON public.expense_summary TO authenticated;

DROP VIEW IF EXISTS public.donation_summary;
CREATE VIEW public.donation_summary AS
  SELECT COALESCE(SUM(amount), 0)::numeric AS total_amount,
         COUNT(*)::bigint AS donation_count
  FROM public.donations;
GRANT SELECT ON public.donation_summary TO authenticated;

DROP VIEW IF EXISTS public.member_summary;
CREATE VIEW public.member_summary AS
  SELECT COUNT(*)::bigint AS total_members,
         COUNT(*) FILTER (WHERE status = 'active')::bigint AS active_members
  FROM public.members;
GRANT SELECT ON public.member_summary TO authenticated;
