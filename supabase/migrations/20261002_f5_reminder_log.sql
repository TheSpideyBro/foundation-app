-- F5: pledge reminder log (2026-10-02)
--
-- Every WhatsApp/SMS pledge reminder attempt (automatic monthly cron or
-- manual staff resend) is logged here so the same member is not spammed
-- twice for the same month and staff can see reminder history.
--
-- Apply: wrap in BEGIN; ... COMMIT; then NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.reminder_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  -- YYYY-MM the reminder is about (usually the previous month)
  month text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'sms')),
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'skipped'
    CHECK (status IN ('sent', 'failed', 'skipped')),
  error text,
  -- NULL = automatic (cron); otherwise the staff user who triggered it
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_member
  ON public.reminder_log (member_id);
CREATE INDEX IF NOT EXISTS idx_reminder_log_month
  ON public.reminder_log (month);
CREATE INDEX IF NOT EXISTS idx_reminder_log_member_month
  ON public.reminder_log (member_id, month);

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reminder_log_select_staff ON public.reminder_log;
CREATE POLICY reminder_log_select_staff ON public.reminder_log
  FOR SELECT TO PUBLIC
  USING ((get_my_role() = ANY (ARRAY['admin'::text, 'treasurer'::text])));

DROP POLICY IF EXISTS reminder_log_insert_staff ON public.reminder_log;
CREATE POLICY reminder_log_insert_staff ON public.reminder_log
  FOR INSERT TO PUBLIC
  WITH CHECK ((get_my_role() = ANY (ARRAY['admin'::text, 'treasurer'::text])));

NOTIFY pgrst, 'reload schema';
