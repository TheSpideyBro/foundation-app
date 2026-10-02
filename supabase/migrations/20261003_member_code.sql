-- Member ID (Excel onujayi 1-44) — human-readable member code.
-- The uuid `id` stays the primary key; this is a display/reference code.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS member_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_member_code
  ON public.members (member_code) WHERE member_code IS NOT NULL;

NOTIFY pgrst, 'reload schema';
