-- ============================================================
-- FIX-RLS-POLICIES-V3  —  run this ONCE in Supabase Dashboard
-- SQL Editor > New query > Run
--
-- CHANGES vs V2:
--   Delete (মুছে ফেলা) এখন শুধু ADMIN role-এ সম্ভব।
--   Treasurer/member অন্যরা add/update/dেখতে পারবে, কিন্তু
--   delete করতে পারবে না।
--
-- Design: per-operation policies (delete separated from
-- select/insert/update), role lookup via get_my_role()
-- (SECURITY DEFINER, no recursion).
-- ============================================================

-- ---------- 1. Role lookup (unchanged, kept for safety) ----------
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

-- ---------- 2. members ----------
drop policy if exists "members_staff" on members;
drop policy if exists "members_delete_admin" on members;
drop policy if exists "members_select_staff" on members;
drop policy if exists "members_insert_staff" on members;
drop policy if exists "members_update_staff" on members;
drop policy if exists "members_delete_staff" on members;
drop policy if exists "members_bootstrap_anyauth" on members;

-- Select / insert / update: admin + treasurer
create policy "members_select_staff" on members for select
  using (get_my_role() in ('admin', 'treasurer'));
create policy "members_insert_staff" on members for insert
  with check (get_my_role() in ('admin', 'treasurer'));
create policy "members_update_staff" on members for update
  using (get_my_role() in ('admin', 'treasurer'));

-- DELETE: admin ONLY
create policy "members_delete_admin" on members for delete
  using (get_my_role() = 'admin');

-- Safety net: while no staff role exists, any signed-in user
-- can manage everything except delete (delete stays blocked
-- until a real admin row appears)
create policy "members_bootstrap_anyauth" on members for all
  using (not exists (select 1 from users where role in ('admin', 'treasurer')));

-- ---------- 3. donations ----------
drop policy if exists "donations_staff" on donations;
drop policy if exists "donations_delete_admin" on donations;
drop policy if exists "donations_select_staff" on donations;
drop policy if exists "donations_insert_staff" on donations;
drop policy if exists "donations_update_staff" on donations;
drop policy if exists "donations_delete_staff" on donations;
drop policy if exists "donations_bootstrap_anyauth" on donations;

create policy "donations_select_staff" on donations for select
  using (get_my_role() in ('admin', 'treasurer'));
create policy "donations_insert_staff" on donations for insert
  with check (get_my_role() in ('admin', 'treasurer'));
create policy "donations_update_staff" on donations for update
  using (get_my_role() in ('admin', 'treasurer'));

create policy "donations_delete_admin" on donations for delete
  using (get_my_role() = 'admin');

create policy "donations_bootstrap_anyauth" on donations for all
  using (not exists (select 1 from users where role in ('admin', 'treasurer')));

-- ---------- 4. expenses ----------
drop policy if exists "expenses_staff" on expenses;
drop policy if exists "expenses_delete_admin" on expenses;
drop policy if exists "expenses_select_staff" on expenses;
drop policy if exists "expenses_insert_staff" on expenses;
drop policy if exists "expenses_update_staff" on expenses;
drop policy if exists "expenses_delete_staff" on expenses;
drop policy if exists "expenses_bootstrap_anyauth" on expenses;

create policy "expenses_select_staff" on expenses for select
  using (get_my_role() in ('admin', 'treasurer'));
create policy "expenses_insert_staff" on expenses for insert
  with check (get_my_role() in ('admin', 'treasurer'));
create policy "expenses_update_staff" on expenses for update
  using (get_my_role() in ('admin', 'treasurer'));

create policy "expenses_delete_admin" on expenses for delete
  using (get_my_role() = 'admin');

create policy "expenses_bootstrap_anyauth" on expenses for all
  using (not exists (select 1 from users where role in ('admin', 'treasurer')));

-- ---------- 5. users ----------
drop policy if exists "users_select_own" on users;
drop policy if exists "users_insert_self" on users;
drop policy if exists "users_admin_select_all" on users;
drop policy if exists "users_admin_update_all" on users;
drop policy if exists "users_update_own" on users;
drop policy if exists "users_bootstrap_anyauth" on users;

create policy "users_select_own" on users for select
  using (id = auth.uid() or get_my_role() = 'admin');
create policy "users_insert_self" on users for insert
  with check (id = auth.uid());
create policy "users_update_own" on users for update
  using (id = auth.uid() or get_my_role() = 'admin')
  with check (id = auth.uid() or get_my_role() = 'admin');

-- ---------- 6. storage (unchanged; delete kept staff-only too) ----------
drop policy if exists "expense_proofs_staff_upload" on storage.objects;
drop policy if exists "expense_proofs_public_read" on storage.objects;
drop policy if exists "expense_proofs_admin_delete" on storage.objects;

create policy "expense_proofs_staff_upload" on storage.objects for insert
  with check (bucket_id = 'expense-proofs'
    and get_my_role() in ('admin', 'treasurer'));
create policy "expense_proofs_admin_delete" on storage.objects for delete
  using (bucket_id = 'expense-proofs'
    and get_my_role() = 'admin');
create policy "expense_proofs_public_read" on storage.objects for select
  using (bucket_id = 'expense-proofs');
