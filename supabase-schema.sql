-- ============================================
-- দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন — Fund Management Database Schema
-- CLEAN CONSOLIDATED VERSION — run this once on a fresh Supabase project
-- ============================================

create extension if not exists "uuid-ossp";

-- ============================================
-- 1. users table (app-level profile, separate from auth.users)
-- ============================================
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  role text not null default 'member' check (role in ('admin', 'treasurer', 'member')),
  created_at timestamptz not null default now()
);

alter table users enable row level security;

-- ============================================
-- 2. members table (the people the foundation supports)
-- ============================================
create table members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  address text,
  join_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table members enable row level security;

-- ============================================
-- 3. donations table
-- ============================================
create table donations (
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

-- ============================================
-- 4. expenses table
-- ============================================
create table expenses (
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

-- ============================================
-- RLS Policies — users
-- ============================================

-- A user can read their own profile (needed for role checks throughout the app)
create policy "users_select_own"
  on users for select
  using (auth.uid() = id);

-- IMPORTANT: without this, signup breaks — the app inserts a profile row for
-- itself right after auth.signUp(), and RLS denies all inserts by default
-- unless a policy explicitly allows it.
create policy "users_insert_self"
  on users for insert
  with check (auth.uid() = id);

-- Admins can view and manage every profile (needed to assign roles)
create policy "users_admin_select_all"
  on users for select
  using (
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "users_admin_update_all"
  on users for update
  using (
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ============================================
-- RLS Policies — members
-- ============================================
create policy "members_select_staff"
  on members for select
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

create policy "members_insert_staff"
  on members for insert
  with check (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

create policy "members_update_staff"
  on members for update
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

create policy "members_delete_staff"
  on members for delete
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

-- ============================================
-- RLS Policies — donations
-- ============================================
create policy "donations_select_staff"
  on donations for select
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

create policy "donations_insert_staff"
  on donations for insert
  with check (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

create policy "donations_update_staff"
  on donations for update
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

create policy "donations_delete_staff"
  on donations for delete
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

-- ============================================
-- RLS Policies — expenses (members never see expenses)
-- ============================================
create policy "expenses_select_staff"
  on expenses for select
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

create policy "expenses_insert_staff"
  on expenses for insert
  with check (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

create policy "expenses_update_staff"
  on expenses for update
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

create policy "expenses_delete_staff"
  on expenses for delete
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

-- ============================================
-- Auto-generate receipt numbers (R-0001, R-0002, ...)
-- ============================================
create or replace function generate_receipt_no()
returns text as $$
declare
  seq_num integer;
begin
  select coalesce(max(cast(nullif(regexp_replace(receipt_no, '[^0-9]', '', 'g'), '') as integer)), 0) + 1
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

create trigger donations_set_receipt_no
  before insert on donations
  for each row
  execute function set_receipt_no();

-- ============================================
-- Storage bucket for expense proof photos
-- ============================================
insert into storage.buckets (id, name, public)
values ('expense-proofs', 'expense-proofs', true)
on conflict (id) do nothing;

create policy "expense_proofs_staff_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'expense-proofs'
    and exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer'))
  );

create policy "expense_proofs_public_read"
  on storage.objects for select
  using (bucket_id = 'expense-proofs');

-- ============================================
-- First admin account
-- After you sign up through the app's own signup form once, run this
-- (replace the email) to promote that account to admin:
-- ============================================
-- update users set role = 'admin' where email = 'your-email@example.com';
