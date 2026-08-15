-- ============================================================
-- FIX-RLS-POLICIES  —  run this ONCE in Supabase Dashboard >
-- SQL Editor > New query > Run
-- Repairs the broken policies on users / members / donations /
-- expenses that were causing "new row violates row-level
-- security policy" errors.
-- ============================================================

-- ---------- 1. users table policies ----------
-- Your account row already exists (role = 'admin'), we just
-- need the policies to let you read/update it and let signup
-- insert work for everyone.

drop policy if exists "users_select_own" on users;
drop policy if exists "users_insert_self" on users;
drop policy if exists "users_admin_select_all" on users;
drop policy if exists "users_admin_update_all" on users;

-- Anyone signed in can read their own profile
create policy "users_select_own" on users for select
  using (auth.uid() = id);

-- Anyone signed in can insert their own profile (signup flow)
create policy "users_insert_self" on users for insert
  with check (auth.uid() = id);

-- Admins / treasurers can read and update every profile
create policy "users_admin_select_all" on users for select
  using (
    exists (select 1 from users u2 where u2.id = auth.uid() and u2.role in ('admin', 'treasurer'))
  );
create policy "users_admin_update_all" on users for update
  using (
    exists (select 1 from users u2 where u2.id = auth.uid() and u2.role in ('admin', 'treasurer'))
  );

-- ---------- 2. members / donations / expenses policies ----------
-- NOTE: these policies check the users table. If for any
-- reason the users table is empty (first setup), allow every
-- authenticated user to manage data so setup never deadlocks.

drop policy if exists "members_select_staff" on members;
drop policy if exists "members_insert_staff" on members;
drop policy if exists "members_update_staff" on members;
drop policy if exists "members_delete_staff" on members;
drop policy if exists "members_bootstrap_anyauth" on members;
drop policy if exists "donations_select_staff" on donations;
drop policy if exists "donations_insert_staff" on donations;
drop policy if exists "donations_update_staff" on donations;
drop policy if exists "donations_delete_staff" on donations;
drop policy if exists "donations_bootstrap_anyauth" on donations;
drop policy if exists "expenses_select_staff" on expenses;
drop policy if exists "expenses_insert_staff" on expenses;
drop policy if exists "expenses_update_staff" on expenses;
drop policy if exists "expenses_delete_staff" on expenses;
drop policy if exists "expenses_bootstrap_anyauth" on expenses;

-- Staff policies: admin or treasurer
create policy "members_select_staff" on members for select
  using (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "members_insert_staff" on members for insert
  with check (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "members_update_staff" on members for update
  using (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "members_delete_staff" on members for delete
  using (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "members_bootstrap_anyauth" on members for all
  using (not exists (select 1 from users where role in ('admin', 'treasurer')))
  with check (not exists (select 1 from users where role in ('admin', 'treasurer')));

create policy "donations_select_staff" on donations for select
  using (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "donations_insert_staff" on donations for insert
  with check (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "donations_update_staff" on donations for update
  using (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "donations_delete_staff" on donations for delete
  using (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "donations_bootstrap_anyauth" on donations for all
  using (not exists (select 1 from users where role in ('admin', 'treasurer')))
  with check (not exists (select 1 from users where role in ('admin', 'treasurer')));

create policy "expenses_select_staff" on expenses for select
  using (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "expenses_insert_staff" on expenses for insert
  with check (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "expenses_update_staff" on expenses for update
  using (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "expenses_delete_staff" on expenses for delete
  using (exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer')));
create policy "expenses_bootstrap_anyauth" on expenses for all
  using (not exists (select 1 from users where role in ('admin', 'treasurer')))
  with check (not exists (select 1 from users where role in ('admin', 'treasurer')));

-- ---------- 3. storage policies (expense proof photos) ----------
drop policy if exists "expense_proofs_staff_upload" on storage.objects;
drop policy if exists "expense_proofs_public_read" on storage.objects;

create policy "expense_proofs_staff_upload" on storage.objects for insert
  with check (
    bucket_id = 'expense-proofs'
    and exists (select 1 from users where id = auth.uid() and role in ('admin', 'treasurer'))
  );
create policy "expense_proofs_public_read" on storage.objects for select
  using (bucket_id = 'expense-proofs');
