-- ============================================
-- Phase 1 Migration — ফাউন্ডেশন ফান্ড অ্যাপ
-- Run this in Supabase SQL Editor (idempotent; safe to run multiple times)
--
-- Changes:
--  1. expense_categories table (master list of expense categories, seed defaults)
--  2. members.monthly_pledge — প্রতি মাসে কত টাকার প্রতিশ্রুতি দিয়েছে
--  3. donations.donation_month — দানটা কোন মাসের (YYYY-MM), নিয়মিত দান track করার জন্য
--  4. RLS policies for the new columns/tables (staff can manage; delete admin-only
--     per fix-rls-policies-v3.sql — this migration does NOT override those)
-- ============================================

create extension if not exists "uuid-ossp";

-- ---------- 1. expense_categories (master table) ----------
create table if not exists expense_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  is_default boolean not null default false,   -- true = seed option shown by default
  created_at timestamptz not null default now()
);
alter table expense_categories enable row level security;

-- Seed the common categories (ignore if already present)
insert into expense_categories (name, is_default) values
  ('চিকিৎসা', true),
  ('শিক্ষা', true),
  ('খাদ্য', true),
  ('জরুরি সহায়তা', true),
  ('বাড়ি ভাড়া', true),
  ('পরিবহন', true),
  ('অন্যান্য', true)
on conflict (name) do nothing;

-- Staff (admin+treasurer) can read the category list; admin manages it.
create policy "expense_categories_select_staff" on expense_categories for select
  using (exists (select 1 from users where users.id = auth.uid() and users.role in ('admin', 'treasurer')));
create policy "expense_categories_insert_admin" on expense_categories for insert
  with check (exists (select 1 from users where users.id = auth.uid() and users.role = 'admin'));
create policy "expense_categories_update_admin" on expense_categories for update
  using (exists (select 1 from users where users.id = auth.uid() and users.role = 'admin'));
create policy "expense_categories_delete_admin" on expense_categories for delete
  using (exists (select 1 from users where users.id = auth.uid() and users.role = 'admin'));

-- ---------- 2. members.monthly_pledge ----------
alter table members add column if not exists monthly_pledge numeric(12,2) default 0
  check (monthly_pledge is null or monthly_pledge >= 0);

-- ---------- 3. donations.donation_month ----------
alter table donations add column if not exists donation_month text default null;
-- Keep a simple trigger so new rows without a month get the current month
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
