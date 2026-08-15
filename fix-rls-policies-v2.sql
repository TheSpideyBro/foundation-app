-- ============================================================
-- FIX-RLS-POLICIES-V2  —  run this ONCE in Supabase Dashboard
-- SQL Editor > New query > Run
--
-- Fixes "infinite recursion detected in policy for relation users".
-- Cause: the old "admin" policies on users read the users table
-- inside their own USING clause, which re-fires the same
-- policies → infinite loop.
--
-- New design: user roles are looked up through a SECURITY
-- DEFINER function (runs as superuser, bypasses RLS, no loop).
-- ============================================================

-- ---------- 1. Role lookup function (supervisors all policies) ----------
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.users where id = auth.uid() limit 1;
$$;

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.get_my_role() to anon;

-- ---------- 2. users table policies (NO self-references) ----------
drop policy if exists "users_select_own" on users;
drop policy if exists "users_insert_self" on users;
drop policy if exists "users_admin_select_all" on users;
drop policy if exists "users_admin_update_all" on users;
drop policy if exists "users_update_own" on users;
drop policy if exists "users_bootstrap_anyauth" on users;

-- Signed-in users read their own profile
create policy "users_select_own" on users for select
  using (auth.uid() = id);

-- Signup: insert only your own row
create policy "users_insert_self" on users for insert
  with check (auth.uid() = id);

-- Update: any signed-in user can update their own row.
-- Role changes are made by the owner via SQL (UPDATE users SET
-- role = 'admin' WHERE id = ...), never through the app.
create policy "users_update_own" on users for update
  using (auth.uid() = id);

-- ---------- 3. members policies ----------
drop policy if exists "members_select_staff" on members;
drop policy if exists "members_insert_staff" on members;
drop policy if exists "members_update_staff" on members;
drop policy if exists "members_delete_staff" on members;
drop policy if exists "members_staff" on members;
drop policy if exists "members_bootstrap_anyauth" on members;

create policy "members_staff" on members for all
  using (get_my_role() in ('admin', 'treasurer'))
  with check (get_my_role() in ('admin', 'treasurer'));

-- Safety net: while nobody has a staff role yet, any signed-in
-- user can manage members (prevents setup deadlocks)
create policy "members_bootstrap_anyauth" on members for all
  using (not exists (select 1 from users where role in ('admin', 'treasurer')))
  with check (not exists (select 1 from users where role in ('admin', 'treasurer')));

-- ---------- 4. donations policies ----------
drop policy if exists "donations_select_staff" on donations;
drop policy if exists "donations_insert_staff" on donations;
drop policy if exists "donations_update_staff" on donations;
drop policy if exists "donations_delete_staff" on donations;
drop policy if exists "donations_staff" on donations;
drop policy if exists "donations_bootstrap_anyauth" on donations;

create policy "donations_staff" on donations for all
  using (get_my_role() in ('admin', 'treasurer'))
  with check (get_my_role() in ('admin', 'treasurer'));

create policy "donations_bootstrap_anyauth" on donations for all
  using (not exists (select 1 from users where role in ('admin', 'treasurer')))
  with check (not exists (select 1 from users where role in ('admin', 'treasurer')));

-- ---------- 5. expenses policies ----------
drop policy if exists "expenses_select_staff" on expenses;
drop policy if exists "expenses_insert_staff" on expenses;
drop policy if exists "expenses_update_staff" on expenses;
drop policy if exists "expenses_delete_staff" on expenses;
drop policy if exists "expenses_staff" on expenses;
drop policy if exists "expenses_bootstrap_anyauth" on expenses;

create policy "expenses_staff" on expenses for all
  using (get_my_role() in ('admin', 'treasurer'))
  with check (get_my_role() in ('admin', 'treasurer'));

create policy "expenses_bootstrap_anyauth" on expenses for all
  using (not exists (select 1 from users where role in ('admin', 'treasurer')))
  with check (not exists (select 1 from users where role in ('admin', 'treasurer')));

-- ---------- 6. storage policies ----------
drop policy if exists "expense_proofs_staff_upload" on storage.objects;
drop policy if exists "expense_proofs_public_read" on storage.objects;

create policy "expense_proofs_staff_upload" on storage.objects for insert
  with check (
    bucket_id = 'expense-proofs'
    and get_my_role() in ('admin', 'treasurer')
  );
create policy "expense_proofs_public_read" on storage.objects for select
  using (bucket_id = 'expense-proofs');
