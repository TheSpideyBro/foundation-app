-- ============================================================
-- Foundation Fund App — RLS SECURITY FIX
-- সমস্যা: Live DB-তে পুরনো/উন্মুক্ত policies থাকায় member
--   (role != admin/treasurer) member / donation / expense
--   INSERT ও UPDATE করতে পারছিল।
-- সমাধান: সকল bootstrap_anyauth/anyauth policy সরিয়ে কঠোর
--   staff-only policies তৈরি করা হলো।
--
-- ব্যবহার: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================

-- ---------- get_my_role() function (ঠিক রাখা হলো, পুনঃতৈরি) ----------
create or replace function get_my_role()
returns text
language sql security definer stable
as $$
  select coalesce((select role from public.users where id = auth.uid()), '')::text;
$$;

-- ---------- members ----------
drop policy if exists "members_bootstrap_anyauth" on members;
drop policy if exists "members_anyauth" on members;
drop policy if exists "members_select_staff" on members;
drop policy if exists "members_insert_staff" on members;
drop policy if exists "members_update_staff" on members;
drop policy if exists "members_delete_admin" on members;

create policy "members_select_staff" on members for select
  using (get_my_role() in ('admin', 'treasurer'));
create policy "members_insert_staff" on members for insert
  with check (get_my_role() in ('admin', 'treasurer'));
create policy "members_update_staff" on members for update
  using (get_my_role() in ('admin', 'treasurer'));
create policy "members_delete_admin" on members for delete
  using (get_my_role() = 'admin');

-- ---------- donations ----------
drop policy if exists "donations_bootstrap_anyauth" on donations;
drop policy if exists "donations_anyauth" on donations;
drop policy if exists "donations_select_staff" on donations;
drop policy if exists "donations_insert_staff" on donations;
drop policy if exists "donations_update_staff" on donations;
drop policy if exists "donations_delete_admin" on donations;

create policy "donations_select_staff" on donations for select
  using (get_my_role() in ('admin', 'treasurer'));
create policy "donations_insert_staff" on donations for insert
  with check (get_my_role() in ('admin', 'treasurer'));
create policy "donations_update_staff" on donations for update
  using (get_my_role() in ('admin', 'treasurer'));
create policy "donations_delete_admin" on donations for delete
  using (get_my_role() = 'admin');

-- ---------- expenses ----------
drop policy if exists "expenses_bootstrap_anyauth" on expenses;
drop policy if exists "expenses_anyauth" on expenses;
drop policy if exists "expenses_select_staff" on expenses;
drop policy if exists "expenses_insert_staff" on expenses;
drop policy if exists "expenses_update_staff" on expenses;
drop policy if exists "expenses_delete_admin" on expenses;

create policy "expenses_select_staff" on expenses for select
  using (get_my_role() in ('admin', 'treasurer'));
create policy "expenses_insert_staff" on expenses for insert
  with check (get_my_role() in ('admin', 'treasurer'));
create policy "expenses_update_staff" on expenses for update
  using (get_my_role() in ('admin', 'treasurer'));
create policy "expenses_delete_admin" on expenses for delete
  using (get_my_role() = 'admin');

-- ---------- expense_categories ----------
drop policy if exists "expense_categories_bootstrap_anyauth" on expense_categories;
drop policy if exists "expense_categories_anyauth" on expense_categories;
drop policy if exists "expense_categories_select_staff" on expense_categories;
drop policy if exists "expense_categories_insert_admin" on expense_categories;
drop policy if exists "expense_categories_update_admin" on expense_categories;
drop policy if exists "expense_categories_delete_admin" on expense_categories;

create policy "expense_categories_select_staff" on expense_categories for select
  using (get_my_role() in ('admin', 'treasurer'));
create policy "expense_categories_insert_admin" on expense_categories for insert
  with check (get_my_role() = 'admin');
create policy "expense_categories_update_admin" on expense_categories for update
  using (get_my_role() = 'admin');
create policy "expense_categories_delete_admin" on expense_categories for delete
  using (get_my_role() = 'admin');

-- ---------- audit_log (admin-only read/write) ----------
drop policy if exists "audit_log_bootstrap_anyauth" on audit_log;
drop policy if exists "audit_log_anyauth" on audit_log;
drop policy if exists "audit_log_select_admin" on audit_log;
drop policy if exists "audit_log_insert_admin" on audit_log;
drop policy if exists "audit_log_update_admin" on audit_log;
drop policy if exists "audit_log_delete_admin" on audit_log;

create policy "audit_log_select_admin" on audit_log for select
  using (get_my_role() = 'admin');
create policy "audit_log_insert_admin" on audit_log for insert
  with check (get_my_role() = 'admin');
create policy "audit_log_update_admin" on audit_log for update
  using (get_my_role() = 'admin');
create policy "audit_log_delete_admin" on audit_log for delete
  using (get_my_role() = 'admin');

-- ---------- users (নিজের প্রোফাইল পড়া + admin/treasurer দেখা) ----------
drop policy if exists "users_bootstrap_anyauth" on users;
drop policy if exists "users_anyauth" on users;
drop policy if exists "users_read_own" on users;
drop policy if exists "users_read_staff" on users;
drop policy if exists "users_update_self" on users;

create policy "users_read_own" on users for select
  using (id = auth.uid());
create policy "users_read_staff" on users for select
  using (get_my_role() in ('admin', 'treasurer'));
create policy "users_update_self" on users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- ব্যবহার সম্পন্ন। নীচের পরীক্ষা (ঐচ্ছিক, verify):
-- login: saddamakash4@gmail.com / TestPass2026! (role=member)
-- member table-এ যেকোনো INSERT করা উচিত → "new row violates row-level security policy" error
-- ============================================================
