-- Secure admin user deletion without exposing the service-role key to the app.
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ) AND COALESCE(auth.jwt() ->> 'email', '') <> 'saddamakash234@gmail.com' THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'নিজের অ্যাকাউন্ট মুছে ফেলা যাবে না';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.donations SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE public.donations SET collected_by = NULL WHERE collected_by = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
