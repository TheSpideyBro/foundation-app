-- Staff who can enter donations can also correct or remove them.
DROP POLICY IF EXISTS "donations_delete_admin" ON public.donations;
CREATE POLICY "donations_delete_staff" ON public.donations
  FOR DELETE USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));

-- Staff need to read the collector directory for the donation form.
DROP POLICY IF EXISTS "users_read_staff" ON public.users;
CREATE POLICY "users_read_staff" ON public.users
  FOR SELECT USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));

GRANT SELECT ON public.users TO authenticated;
NOTIFY pgrst, 'reload schema';
