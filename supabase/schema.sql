-- Foundation Fund App - Supabase Schema V3 (Latest State)
-- Generated on: Aug 25, 2026

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables

-- Users table (extends Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    is_approved BOOLEAN DEFAULT false,
    member_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Members table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active',
    monthly_pledge NUMERIC DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Donations table
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    method TEXT NOT NULL,
    receipt_no TEXT NOT NULL,
    donation_month TEXT,
    received_by TEXT,
    collected_by UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    proof_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notices table
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    actor_email TEXT,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log View
CREATE OR REPLACE VIEW public.audit_log_view AS
 SELECT id,
    action,
    target_table AS table_name,
    target_id AS record_id,
    details,
    created_at,
    actor_email AS user_email
   FROM audit_log;

-- 3. Functions & Triggers

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT coalesce(role, 'member') FROM public.users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_no()
RETURNS TEXT AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT coalesce(max(cast(nullif(regexp_replace(receipt_no, '[^0-9]', '', 'g'), '') as integer)), 0) + 1
  INTO seq_num
  FROM donations
  WHERE receipt_no ~ '^R-[0-9]+$';
  RETURN 'R-' || lpad(seq_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to set receipt number on insert
CREATE OR REPLACE FUNCTION public.set_receipt_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_no IS NULL THEN
    NEW.receipt_no := generate_receipt_no();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_set_receipt_no
BEFORE INSERT ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.set_receipt_no();

-- Trigger to set donation month
CREATE OR REPLACE FUNCTION public.set_donation_month()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.donation_month IS NULL THEN
    NEW.donation_month := to_char(NEW.date, 'YYYY-MM');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_set_donation_month
BEFORE INSERT ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.set_donation_month();

-- Audit Triggers
CREATE OR REPLACE TRIGGER audit_members
AFTER INSERT OR UPDATE OR DELETE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_donations
AFTER INSERT OR UPDATE OR DELETE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 4. RLS Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users Policies
CREATE POLICY "users_read_all" ON public.users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_read_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_read_staff" ON public.users FOR SELECT USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));
CREATE POLICY "users_insert_self" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_self" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_admin_all" ON public.users FOR ALL USING (get_my_role() = 'admin');

-- Members Policies
CREATE POLICY "members_select_all" ON public.members FOR SELECT USING (true);
CREATE POLICY "members_insert_staff" ON public.members FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['admin', 'treasurer']));
CREATE POLICY "members_update_staff" ON public.members FOR UPDATE USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));
CREATE POLICY "members_delete_admin" ON public.members FOR DELETE USING (get_my_role() = 'admin');

-- Donations Policies
CREATE POLICY "donations_select_own" ON public.donations FOR SELECT USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = donations.member_id AND members.user_id = auth.uid())
);
CREATE POLICY "donations_select_staff" ON public.donations FOR SELECT USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));
CREATE POLICY "donations_insert_staff" ON public.donations FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['admin', 'treasurer']));
CREATE POLICY "donations_update_staff" ON public.donations FOR UPDATE USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));
CREATE POLICY "donations_delete_admin" ON public.donations FOR DELETE USING (get_my_role() = 'admin');

-- Expenses Policies
CREATE POLICY "expenses_select_all" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "expenses_insert_staff" ON public.expenses FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['admin', 'treasurer']));
CREATE POLICY "expenses_update_staff" ON public.expenses FOR UPDATE USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));
CREATE POLICY "expenses_delete_admin" ON public.expenses FOR DELETE USING (get_my_role() = 'admin');

-- Expense Categories Policies
CREATE POLICY "expense_categories_select_staff" ON public.expense_categories FOR SELECT USING (get_my_role() = ANY (ARRAY['admin', 'treasurer']));
CREATE POLICY "expense_categories_insert_admin" ON public.expense_categories FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "expense_categories_update_admin" ON public.expense_categories FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "expense_categories_delete_admin" ON public.expense_categories FOR DELETE USING (get_my_role() = 'admin');

-- Notices Policies
CREATE POLICY "notices_select_all" ON public.notices FOR SELECT USING (true);
CREATE POLICY "notices_insert_admin" ON public.notices FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "notices_update_admin" ON public.notices FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "notices_delete_admin" ON public.notices FOR DELETE USING (get_my_role() = 'admin');

-- Audit Log Policies
CREATE POLICY "audit_log_select_admin" ON public.audit_log FOR SELECT USING (get_my_role() = 'admin');
CREATE POLICY "audit_log_insert_system" ON public.audit_log FOR INSERT WITH CHECK (true);
