-- ============================================================
-- Foundation Fund App — RLS SECURITY FIX (v2 — সুরক্ষিত সংস্করণ)
--
-- পরিবর্তন (v2): যেকোনো টেবিল ডাটাবেসে না থাকলে ওই অংশ
-- স্কিপ করবে — আর কোনো এরর আসবে না।
--
-- কী করে: সকল bootstrap_anyauth/anyauth policy সরিয়ে কঠোর
--   staff-only policies তৈরি করে।
--   SELECT/INSERT/UPDATE = admin | treasurer
--   DELETE = admin only
--
-- ব্যবহার: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================

-- ---------- get_my_role() function (আগে তৈরি/আপডেট) ----------
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select coalesce(role, 'member') from public.users where id = auth.uid() limit 1;
$$;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.get_my_role() to anon;

-- ============================================================
-- একটা হেল্পার ফাংশন: টেবিল থাকলে policy সেট করবে, না থাকলে
-- চুপচাপ স্কিপ করবে
-- ============================================================
create or replace function public.apply_security_policies()
returns void
language plpgsql
security definer
as $$
declare
  t_name text;
begin

  -- ---------- members ----------
  if to_regclass('public.members') is not null then
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
  end if;

  -- ---------- donations ----------
  if to_regclass('public.donations') is not null then
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
  end if;

  -- ---------- expenses ----------
  if to_regclass('public.expenses') is not null then
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
  end if;

  -- ---------- expense_categories ----------
  if to_regclass('public.expense_categories') is not null then
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
  end if;

  -- ---------- audit_log ----------
  if to_regclass('public.audit_log') is not null then
    drop policy if exists "audit_log_bootstrap_anyauth" on audit_log;
    drop policy if exists "audit_log_anyauth" on audit_log;
    drop policy if exists "audit_log_select_admin" on audit_log;
    drop policy if exists "audit_log_insert_admin" on audit_log;
    drop policy if exists "audit_log_update_admin" on audit_log;
    drop policy if exists "audit_log_delete_admin" on audit_log;
    drop policy if exists "audit_select_staff" on audit_log;
    drop policy if exists "audit_insert_app" on audit_log;
    drop policy if exists "audit_no_update" on audit_log;
    drop policy if exists "audit_no_delete" on audit_log;
    create policy "audit_log_select_admin" on audit_log for select
      using (get_my_role() = 'admin');
    create policy "audit_log_insert_admin" on audit_log for insert
      with check (get_my_role() = 'admin');
    create policy "audit_log_update_admin" on audit_log for update
      using (get_my_role() = 'admin');
    create policy "audit_log_delete_admin" on audit_log for delete
      using (get_my_role() = 'admin');
  end if;

  -- ---------- users ----------
  if to_regclass('public.users') is not null then
    drop policy if exists "users_bootstrap_anyauth" on users;
    drop policy if exists "users_anyauth" on users;
    drop policy if exists "users_select_own" on users;
    drop policy if exists "users_read_own" on users;
    drop policy if exists "users_read_staff" on users;
    drop policy if exists "users_insert_self" on users;
    drop policy if exists "users_update_self" on users;
    drop policy if exists "users_update_own" on users;
    create policy "users_read_own" on users for select
      using (id = auth.uid());
    create policy "users_read_staff" on users for select
      using (get_my_role() in ('admin', 'treasurer'));
    create policy "users_insert_self" on users for insert
      with check (id = auth.uid());
    create policy "users_update_self" on users for update
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  raise notice 'SECURITY FIX APPLIED';
end;
$$;

-- ---------- হেল্পার চালানো ----------
select public.apply_security_policies();
drop function if exists public.apply_security_policies();

-- ============================================================
-- সম্পন্ন।
-- ============================================================
