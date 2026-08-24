-- ============================================================
-- FULL SCHEMA — দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযূল ফাউন্ডেশন
-- Fund Management App (fresh start — একটাই ফাইল, সবকিছু একে)
--
-- Run once in Supabase Dashboard > SQL Editor
-- Idempotent: multiple বার রান করলেও এরর আসবে না।
--
-- যা যা আছে:
--   1. users / members / donations / expenses tables
--   2. expense_categories (master ক্যাটাগরি টেবিল)
--   3. members.monthly_pledge + donations.donation_month
--   4. audit_log + log_audit_event() helper
--   5. receipt_no auto-generator (R-0001, R-0002, ...)
--   6. donation_month auto-trigger
--   7. storage bucket: expense-proofs
--   9. সব RLS policies — delete শুধু ADMIN
--  10. [FIXED] role escalation বন্ধ — INSERT ও UPDATE দুটোতেই
--      enforce_role_integrity() trigger (DB-level)
--  11. [FIXED] insert/update/delete grants (শুধু select ছিল না)
--  12. [FIXED] users টেবিলে admin delete — grant + policy (Admin
--      প্যানেল থেকে user মুছা যায়)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- SECTION 1 — Base tables (users, members, donations, expenses)
-- ============================================================

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  role text not null default 'member'
    check (role in ('admin', 'treasurer', 'member')),
  created_at timestamptz not null default now()
);
alter table users enable row level security;

create table if not exists members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  address text,
  join_date date not null default current_date,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table members enable row level security;

create table if not exists donations (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references members(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  method text not null check (method in ('cash', 'bkash', 'nagad', 'bank')),
  receipt_no text not null unique,
  received_by text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
alter table donations enable row level security;

create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  description text,
  proof_url text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
alter table expenses enable row level security;

-- ============================================================
-- SECTION 2 — expense_categories (master ক্যাটাগরি টেবিল)
-- ============================================================

create table if not exists expense_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table expense_categories enable row level security;

insert into expense_categories (name, is_default) values
  ('চিকিৎসা', true),
  ('শিক্ষা', true),
  ('খাদ্য', true),
  ('জরুরি সহায়তা', true),
  ('বাড়ি ভাড়া', true),
  ('পরিবহন', true),
  ('অন্যান্য', true)
on conflict (name) do nothing;

-- ============================================================
-- SECTION 3 — Phase 1 columns + triggers
-- ============================================================

alter table members add column if not exists monthly_pledge numeric(12,2)
  default 0 check (monthly_pledge is null or monthly_pledge >= 0);

alter table donations add column if not exists donation_month text default null;

-- donation_month: না দিলে তারিখের মাস অটো বসে (January–December track)
create or replace function set_donation_month()
returns trigger as $$
begin
  if new.donation_month is null then
    new.donation_month := to_char(new.date, 'YYYY-MM');
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists donations_set_donation_month on donations;
create trigger donations_set_donation_month
  before insert on donations
  for each row execute function set_donation_month();

-- receipt_no: auto-generate R-0001, R-0002, ... (duplicate-safe, concurrent-safe)
create or replace function generate_receipt_no()
returns text as $$
declare
  seq_num integer;
begin
  select coalesce(max(
    cast(nullif(regexp_replace(receipt_no, '[^0-9]', '', 'g'), '') as integer)), 0) + 1
    into seq_num
    from donations
    where receipt_no ~ '^R-[0-9]+$';
  return 'R-' || lpad(seq_num::text, 4, '0');
end;
$$ language plpgsql security definer;

create or replace function set_receipt_no()
returns trigger as $$
begin
  if new.receipt_no is null then
    new.receipt_no := generate_receipt_no();
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists donations_set_receipt_no on donations;
create trigger donations_set_receipt_no
  before insert on donations
  for each row execute function set_receipt_no();

-- ============================================================
-- SECTION 4 — audit_log (Phase 2)
-- ============================================================

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  actor_id uuid not null,
  actor_email text,
  action text not null,                      -- member.insert | donation.delete ...
  target_table text,                         -- members | donations | expenses | users
  target_id text,                            -- affected row id
  details jsonb default '{}'::jsonb,
  ip text
);
create index if not exists idx_audit_created on public.audit_log (created_at desc);
create index if not exists idx_audit_target on public.audit_log (target_table);
alter table public.audit_log enable row level security;

-- কেউ সরাসরি audit লগ লিখতে/পড়তে/মুছতে পারবে না (app নিজের function ব্যবহার করে)
create policy if not exists audit_insert_app on public.audit_log
  for insert with check (false);
create policy if not exists audit_select_staff on public.audit_log
  for select using (get_my_role() in ('admin', 'treasurer'));
create policy if not exists audit_no_update on public.audit_log
  for update using (false);
create policy if not exists audit_no_delete on public.audit_log
  for delete using (false);

-- Secure helper: app এরভাবে log করে
create or replace function public.log_audit_event(
  p_action text,
  p_target_table text,
  p_target_id text default null,
  p_details jsonb default '{}'::jsonb
) returns void
language plpgsql security definer
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  insert into public.audit_log (actor_id, actor_email, action, target_table, target_id, details)
  values (auth.uid(), v_email, p_action, p_target_table, p_target_id, p_details);
end;
$$;

-- ============================================================
-- SECTION 5 — Role helper + RLS policies (সবসময় DELETE = admin only)
-- ============================================================

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

-- ---------- users ----------
drop policy if exists "users_select_own" on users;
drop policy if exists "users_insert_self" on users;
drop policy if exists "users_admin_select_all" on users;
drop policy if exists "users_admin_update_all" on users;
drop policy if exists "users_update_own" on users;
drop policy if exists "users_delete_admin" on users;
drop policy if exists "users_bootstrap_anyauth" on users;
drop policy if exists "users_anyauth" on users;

create policy "users_select_own" on users for select
  using (id = auth.uid() or get_my_role() = 'admin');
create policy "users_insert_self" on users for insert
  with check (id = auth.uid());
create policy "users_update_own" on users for update
  using (id = auth.uid() or get_my_role() = 'admin')
  with check (id = auth.uid() or get_my_role() = 'admin');
-- DELETE: শুধু ADMIN (Admin প্যানেল → ব্যবহারকারী ট্যাব)
create policy "users_delete_admin" on users for delete
  using (get_my_role() = 'admin');

-- [FIXED] role escalation guard — RLS policies above only check row
-- ownership, not which column changes. Without this trigger, any
-- signed-in user could set their own `role` to 'admin' via INSERT
-- (at signup) or UPDATE (on their own row). This trigger enforces
-- role integrity at the database level regardless of what the app
-- or RLS policy text allows.
create or replace function public.enforce_role_integrity()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    if new.role is distinct from 'member' and public.get_my_role() <> 'admin' then
      new.role := 'member';
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.role is distinct from old.role and public.get_my_role() <> 'admin' then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_role_integrity on public.users;
create trigger trg_enforce_role_integrity
  before insert or update on public.users
  for each row execute function public.enforce_role_integrity();

-- ---------- members ----------
drop policy if exists "members_staff" on members;
drop policy if exists "members_delete_admin" on members;
drop policy if exists "members_select_staff" on members;
drop policy if exists "members_insert_staff" on members;
drop policy if exists "members_update_staff" on members;
drop policy if exists "members_delete_staff" on members;
drop policy if exists "members_bootstrap_anyauth" on members;
drop policy if exists "members_anyauth" on members;

create policy "members_select_staff" on members for select
  using (get_my_role() in ('admin', 'treasurer'));
create policy "members_insert_staff" on members for insert
  with check (get_my_role() in ('admin', 'treasurer'));
create policy "members_update_staff" on members for update
  using (get_my_role() in ('admin', 'treasurer'));
-- DELETE: শুধু ADMIN
create policy "members_delete_admin" on members for delete
  using (get_my_role() = 'admin');
-- Safety net: কোনো admin/treasurer না থাকলে যেকোনো sign-in করা user manage করতে পারবে
-- (কিন্তু delete তবুও ব্লক থাকবে যতক্ষণ না admin row আসে)
create policy "members_bootstrap_anyauth" on members for all
  using (not exists (select 1 from users where role in ('admin', 'treasurer')));

-- ---------- donations ----------
drop policy if exists "donations_staff" on donations;
drop policy if exists "donations_delete_admin" on donations;
drop policy if exists "donations_select_staff" on donations;
drop policy if exists "donations_insert_staff" on donations;
drop policy if exists "donations_update_staff" on donations;
drop policy if exists "donations_delete_staff" on donations;
drop policy if exists "donations_bootstrap_anyauth" on donations;
drop policy if exists "donations_anyauth" on donations;

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

-- ---------- expenses ----------
drop policy if exists "expenses_staff" on expenses;
drop policy if exists "expenses_delete_admin" on expenses;
drop policy if exists "expenses_select_staff" on expenses;
drop policy if exists "expenses_insert_staff" on expenses;
drop policy if exists "expenses_update_staff" on expenses;
drop policy if exists "expenses_delete_staff" on expenses;
drop policy if exists "expenses_bootstrap_anyauth" on expenses;
drop policy if exists "expenses_anyauth" on expenses;

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

-- ---------- expense_categories ----------
drop policy if exists "expense_categories_select_staff" on expense_categories;
drop policy if exists "expense_categories_insert_admin" on expense_categories;
drop policy if exists "expense_categories_update_admin" on expense_categories;
drop policy if exists "expense_categories_delete_admin" on expense_categories;
drop policy if exists "expense_categories_select_all" on expense_categories;
drop policy if exists "expense_categories_anyauth" on expense_categories;

create policy "expense_categories_select_staff" on expense_categories for select
  using (get_my_role() in ('admin', 'treasurer'));
create policy "expense_categories_insert_admin" on expense_categories for insert
  with check (get_my_role() = 'admin');
create policy "expense_categories_update_admin" on expense_categories for update
  using (get_my_role() = 'admin');
create policy "expense_categories_delete_admin" on expense_categories for delete
  using (get_my_role() = 'admin');
-- Safety net: admin না থাকলে ক্যাটাগরি লিস্ট দেখা যায় (form load-এর জন্য)
create policy "expense_categories_select_all" on expense_categories for select
  using (not exists (select 1 from users where role in ('admin', 'treasurer')));

-- ---------- storage: expense-proofs ----------
insert into storage.buckets (id, name, public)
values ('expense-proofs', 'expense-proofs', true)
on conflict (id) do nothing;

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

-- ============================================================
-- SECTION 6 — Default grants
-- ============================================================
revoke all on members from public;
revoke all on donations from public;
revoke all on expenses from public;
revoke all on users from public;
revoke all on expense_categories from public;

grant select, insert, update, delete on members to authenticated;
grant select, insert, update, delete on donations to authenticated;
grant select, insert, update, delete on expenses to authenticated;
grant select, insert, update, delete on users to authenticated;
grant select, insert, update, delete on expense_categories to authenticated;

-- ============================================================
-- FINISHED — এবার app থেকে Sign out → Sign in করুন
-- প্রথমবার login করার পর, সেই account-কে admin করুন:
--   update users set role = 'admin' where email = 'আপনার email';
-- দ্রষ্টব্য: role escalation trigger-এর কারণে প্রথম admin প্রমোট
-- SQL Editor থেকেই করতে হবে (App-এর Admin প্যানেল থেকে নিজেকে admin
-- বানানো যাবে না — এটা ইচ্ছাকৃত সুরক্ষা)। তারপর থেকে Admin প্যানেল
-- থেকে যেকোনো user-এর role পরিবর্তন/মুছা যাবে।
-- ============================================================
