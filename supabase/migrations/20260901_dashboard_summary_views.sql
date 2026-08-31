-- Database-side dashboard summaries. The view expands a multi-month donation
-- across its covered months so charts do not fetch every donation row.
CREATE OR REPLACE VIEW public.monthly_collection_summary AS
WITH months AS (
  SELECT generate_series(
    date_trunc('month', CURRENT_DATE) - interval '11 months',
    date_trunc('month', CURRENT_DATE),
    interval '1 month'
  )::date AS month
), active_targets AS (
  SELECT
    months.month,
    COALESCE(SUM(m.monthly_pledge), 0)::numeric AS target_amount,
    COUNT(m.id)::bigint AS active_members
  FROM months
  LEFT JOIN public.members m
    ON m.status = 'active'
   AND date_trunc('month', m.join_date)::date <= months.month
  GROUP BY months.month
), donation_allocations AS (
  SELECT
    gs.month::date AS month,
    d.amount / GREATEST(
      1,
      ((date_part('year', end_month) - date_part('year', start_month)) * 12)
      + date_part('month', end_month) - date_part('month', start_month) + 1
    ) AS allocated_amount
  FROM public.donations d
  CROSS JOIN LATERAL (
    SELECT
      date_trunc('month', COALESCE(to_date(NULLIF(d.donation_month, ''), 'YYYY-MM'), d.date))::date AS start_month,
      date_trunc('month', COALESCE(to_date(NULLIF(d.donation_end_month, ''), 'YYYY-MM'), to_date(NULLIF(d.donation_month, ''), 'YYYY-MM'), d.date))::date AS end_month
  ) range
  CROSS JOIN LATERAL generate_series(range.start_month, range.end_month, interval '1 month') gs(month)
), donation_totals AS (
  SELECT month, COALESCE(SUM(allocated_amount), 0)::numeric AS collected_amount
  FROM donation_allocations
  WHERE month BETWEEN date_trunc('month', CURRENT_DATE) - interval '11 months' AND date_trunc('month', CURRENT_DATE)
  GROUP BY month
), expense_totals AS (
  SELECT date_trunc('month', date)::date AS month, COALESCE(SUM(amount), 0)::numeric AS expense_amount
  FROM public.expenses
  WHERE date >= (date_trunc('month', CURRENT_DATE) - interval '11 months')::date
  GROUP BY date_trunc('month', date)::date
)
SELECT
  at.month,
  at.target_amount,
  COALESCE(dt.collected_amount, 0)::numeric AS collected_amount,
  GREATEST(at.target_amount - COALESCE(dt.collected_amount, 0), 0)::numeric AS due_amount,
  CASE WHEN at.target_amount > 0 THEN ROUND((COALESCE(dt.collected_amount, 0) / at.target_amount) * 100, 2) ELSE 0 END::numeric AS collection_rate,
  at.active_members,
  COALESCE(et.expense_amount, 0)::numeric AS expense_amount,
  (COALESCE(dt.collected_amount, 0) - COALESCE(et.expense_amount, 0))::numeric AS net_balance
FROM active_targets at
LEFT JOIN donation_totals dt ON dt.month = at.month
LEFT JOIN expense_totals et ON et.month = at.month
ORDER BY at.month;

CREATE OR REPLACE VIEW public.expense_category_summary AS
SELECT COALESCE(category, 'অন্যান্য') AS category, COALESCE(SUM(amount), 0)::numeric AS total_amount
FROM public.expenses
GROUP BY COALESCE(category, 'অন্যান্য');

GRANT SELECT ON public.monthly_collection_summary TO authenticated;
GRANT SELECT ON public.expense_category_summary TO authenticated;
NOTIFY pgrst, 'reload schema';
