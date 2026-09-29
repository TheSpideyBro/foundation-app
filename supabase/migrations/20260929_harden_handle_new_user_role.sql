-- Harden handle_new_user(): never trust client-supplied auth metadata for
-- privileged columns.
--
-- BUG-012 (privilege escalation). Before this migration,
-- public.handle_new_user() read `role` and `is_approved` directly from
-- auth.users.raw_user_meta_data, which ANY client controls:
--
--   supabase.auth.signUp({ email, password, options: { data: {
--     role: 'admin', is_approved: true } } })
--
-- The SECURITY DEFINER trigger then inserted role='admin', is_approved=true
-- into public.users, bypassing RLS (users_insert_self only guards the
-- client-side INSERT path, which this trigger never takes). The attacker was
-- an approved admin: get_my_role() returned 'admin' for every RLS policy and
-- every /api/admin/* check passed.
--
-- Now: role and is_approved are ALWAYS 'member' / false at signup. Only an
-- admin may promote a user or approve an account (public.users update,
-- gated by RLS + /api routes).
--
-- Name and phone stay client-supplied: they are not privileged.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone, role, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone',
    'member',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recompute nothing: existing rows are left untouched by design. Any account
-- that already has role='admin' or is_approved=true keeps it — verify those
-- accounts manually (SELECT id, email, role, is_approved FROM public.users
-- WHERE role <> 'member' OR is_approved) and demote anything unrecognised.

NOTIFY pgrst, 'reload schema';
