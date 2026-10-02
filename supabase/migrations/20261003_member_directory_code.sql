-- Add member_code to member_directory view (was missing after 20261003_member_code).

CREATE OR REPLACE VIEW public.member_directory AS
 SELECT id,
    member_code,
    name,
    join_date,
    status,
    monthly_pledge,
    created_at
   FROM members;

ALTER VIEW public.member_directory SET (security_invoker = true);

NOTIFY pgrst, 'reload schema';
