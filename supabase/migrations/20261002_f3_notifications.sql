-- F3 automatic receipt delivery (WhatsApp/SMS) - notifications log table.
-- Every receipt-delivery attempt (automatic on জমা via POST /api/payments,
-- or manual resend via POST /api/notify/whatsapp) is recorded here so the
-- donations list can show delivery status and staff can audit failures.
-- The `channel` column already supports 'sms' for a future SMS provider;
-- today only WhatsApp (Meta Cloud API, lib/whatsapp.ts) is wired.
--
-- Conventions (AGENTS.md / docs/database/MIGRATIONS.md):
--   * Applied via the management API wrapped in BEGIN; ... COMMIT;
--     (the applier adds the wrapper - this file must NOT include it).
--   * Every statement idempotent so a partial application is safe to resume.
--   * Main project only (supabase/migrations/). Never cross-apply to Test.
--   * NOT applied yet - files only. After applying: regenerate
--     supabase/schema.sql and re-run the verification queries below.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id uuid REFERENCES public.donations(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms')),
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'skipped'
    CHECK (status IN ('sent', 'failed', 'skipped')),
  provider_message_id text,
  error text,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_donation
  ON public.notifications (donation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_member
  ON public.notifications (member_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_staff" ON public.notifications;
CREATE POLICY "notifications_select_staff" ON public.notifications
  FOR SELECT TO PUBLIC
  USING (get_my_role() IN ('admin', 'treasurer'));

DROP POLICY IF EXISTS "notifications_insert_staff" ON public.notifications;
CREATE POLICY "notifications_insert_staff" ON public.notifications
  FOR INSERT TO PUBLIC
  WITH CHECK (get_my_role() IN ('admin', 'treasurer'));

NOTIFY pgrst, 'reload schema';

-- Verification (run after apply):
--   SELECT policyname, cmd FROM pg_policies WHERE schemaname='public'
--     AND tablename='notifications' ORDER BY 1;
--   -- expect 2 rows: notifications_insert_staff (INSERT),
--   -- notifications_select_staff (SELECT)
