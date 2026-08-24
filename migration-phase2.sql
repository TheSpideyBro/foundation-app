-- Phase 2 migration: audit_log table + policies
-- Run once in Supabase SQL Editor.
-- IMPORTANT: run fix-rls-policies-v3.sql and migration-phase1.sql FIRST if not already done.

-- ============================================================
-- 1. audit_log table — records important actions
-- ============================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  actor_id uuid not null,                                -- auth.users id who did it
  actor_email text,                                      -- cached email for display
  action text not null,                                  -- e.g. 'donation.insert' | 'member.delete'
  target_table text,                                     -- members | donations | expenses | users | expense_categories
  target_id text,                                        -- row id affected (nullable for bulk/login)
  details jsonb default '{}'::jsonb,                     -- extra info (amount, name, old values)
  ip text
);

-- Indexes for admin UI + reports
create index if not exists idx_audit_created on public.audit_log (created_at desc);
create index if not exists idx_audit_target on public.audit_log (target_table);

alter table public.audit_log enable row level security;

-- INSERT: only the app's own service-level writes — staff can't write directly
create policy audit_insert_app on public.audit_log
  for insert with check (false);

-- SELECT: anyone with staff access (admin/treasurer) can read audit log
create policy audit_select_staff on public.audit_log
  for select using (get_my_role() in ('admin', 'treasurer'));

-- No updates / deletes for anyone
create policy audit_no_update on public.audit_log for update using (false);
create policy audit_no_delete on public.audit_log for delete using (false);

-- ============================================================
-- 2. Secure helper function to write audit entries
--    (SECURITY DEFINER — bypasses the INSERT policy so the app can log)
-- ============================================================
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

-- The function itself is callable by anyone logged in — logging their own action
-- is fine (they can't read/delete logs thanks to RLS above).

-- ============================================================
-- DONE — sign out & sign in again in the app after running
-- ============================================================
