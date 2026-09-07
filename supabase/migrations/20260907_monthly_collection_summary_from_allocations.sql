-- Canonical monthly collection reporting, derived from payment_allocations.
--
-- payment_allocations is the single source of truth for monthly collected
-- amounts. Only 'pledge' and 'advance' rows with a concrete month count toward
-- collected_amount; 'unallocated' extra cash (month IS NULL) is intentionally
-- excluded so that a large payment never inflates a month it did not cover.
--
-- For donations that have not been backfilled into payment_allocations yet, a
-- bug-free inline fallback allocates each payment across its covered months up
-- to that member's effective pledge — WITHOUT pushing any excess into the last
-- covered month (the previous view's behaviour, now removed). Run
-- backfill_payment_allocations() after this migration so every donation is
-- represented in the table and the fallback path stops being exercised.
CREATE OR REPLACE VIEW public.monthly_collection_summary AS
WITH RECURSIVE
report_window AS (
  SELECT
    date_trunc('month', CURRENT_DATE)::date AS window_end,
    (date_trunc('month', CURRENT_DATE) - interval '11 months')::date AS window_start
),
raw_ranges AS (
  SELECT
    d.id,
    d.member_id,
    d.amount::numeric AS amount,
    d.date,
    date_trunc('month', COALESCE(
      to_date(NULLIF(d.coverage_start_month, ''), 'YYYY-MM'),
      to_date(NULLIF(d.donation_month, ''), 'YYYY-MM'),
      d.date
    ))::date AS start_month,
    date_trunc(
      'month',
      COALESCE(
        to_date(NULLIF(d.coverage_end_month, ''), 'YYYY-MM'),
        to_date(NULLIF(d.donation_end_month, ''), 'YYYY-MM'),
        to_date(NULLIF(d.coverage_start_month, ''), 'YYYY-MM'),
        to_date(NULLIF(d.donation_month, ''), 'YYYY-MM'),
        d.date
      )
    )::date AS end_month
  FROM public.donations d
),
calendar_bounds AS (
  SELECT
    LEAST(w.window_start, COALESCE(MIN(r.start_month), w.window_start))::date AS start_month,
    GREATEST(w.window_end, COALESCE(MAX(r.end_month), w.window_end))::date AS end_month,
    w.window_start,
    w.window_end
  FROM report_window w
  LEFT JOIN raw_ranges r ON TRUE
  GROUP BY w.window_start, w.window_end
),
months AS (
  SELECT gs::date AS month
  FROM calendar_bounds b
  CROSS JOIN LATERAL generate_series(b.start_month, b.end_month, interval '1 month') gs
),
member_month_pledges AS (
  SELECT
    months.month,
    m.id AS member_id,
    m.status,
    COALESCE(
      (
        SELECT mph.monthly_amount::numeric
        FROM public.member_pledge_history mph
        WHERE mph.member_id = m.id
          AND mph.effective_from_month <= to_char(months.month, 'YYYY-MM')
        ORDER BY mph.effective_from_month DESC
        LIMIT 1
      ),
      m.monthly_pledge::numeric,
      0
    ) AS expected_amount
  FROM months
  CROSS JOIN public.members m
  WHERE m.join_date IS NULL
     OR date_trunc('month', m.join_date)::date <= months.month
),
active_targets AS (
  SELECT
    p.month,
    COALESCE(SUM(p.expected_amount) FILTER (WHERE p.status = 'active'), 0)::numeric AS target_amount,
    COUNT(*) FILTER (WHERE p.status = 'active')::bigint AS active_members
  FROM member_month_pledges p
  GROUP BY p.month
),
-- Source of truth: persisted allocations (pledge/advance with a concrete month)
allocated_totals AS (
  SELECT
    (pa.month || '-01')::date AS month,
    SUM(pa.amount)::numeric AS collected_amount
  FROM public.payment_allocations pa
  CROSS JOIN report_window w
  WHERE pa.allocation_type IN ('pledge', 'advance')
    AND pa.month IS NOT NULL
    AND (pa.month || '-01')::date BETWEEN w.window_start AND w.window_end
  GROUP BY pa.month
),
-- Fallback for donations not yet backfilled into payment_allocations.
-- Bug-free: excess beyond total pledge capacity is dropped (unallocated),
-- never dumped into the last covered month.
legacy_ranges AS (
  SELECT r.*
  FROM raw_ranges r
  WHERE r.member_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_allocations pa WHERE pa.payment_id = r.id
    )
),
ordered_donations AS (
  SELECT
    r.*,
    ROW_NUMBER() OVER (PARTITION BY r.member_id ORDER BY r.date, r.id) AS donation_seq
  FROM legacy_ranges r
),
allocation_states(member_id, donation_seq, paid_by_month) AS (
  SELECT DISTINCT r.member_id, 0::bigint, '{}'::jsonb
  FROM ordered_donations r

  UNION ALL

  SELECT
    s.member_id,
    d.donation_seq,
    s.paid_by_month || COALESCE(a.updates, '{}'::jsonb)
  FROM allocation_states s
  JOIN ordered_donations d
    ON d.member_id = s.member_id
   AND d.donation_seq = s.donation_seq + 1
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      jsonb_object_agg(x.month_text, to_jsonb(x.prior_paid + x.allocation)),
      '{}'::jsonb
    ) AS updates
    FROM (
      SELECT
        y.month_text,
        y.prior_paid,
        -- No excess-push: each month gets at most its remaining capacity.
        GREATEST(LEAST(y.amount - y.required_before, y.capacity), 0)::numeric AS allocation
      FROM (
        SELECT
          dm.month_text,
          dm.amount,
          dm.prior_paid,
          dm.capacity,
          COALESCE(
            SUM(dm.capacity) OVER (
              ORDER BY dm.month_text
              ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ),
            0
          )::numeric AS required_before
        FROM (
          SELECT
            to_char(gs.month, 'YYYY-MM') AS month_text,
            d.amount,
            COALESCE((s.paid_by_month ->> to_char(gs.month, 'YYYY-MM'))::numeric, 0)::numeric AS prior_paid,
            GREATEST(
              COALESCE(
                (
                  SELECT p.expected_amount
                  FROM member_month_pledges p
                  WHERE p.member_id = d.member_id
                    AND p.month = gs.month::date
                  LIMIT 1
                ),
                0
              ) - COALESCE((s.paid_by_month ->> to_char(gs.month, 'YYYY-MM'))::numeric, 0),
              0
            )::numeric AS capacity
          FROM generate_series(d.start_month, d.end_month, interval '1 month') gs(month)
        ) dm
      ) y
    ) x
  ) a
),
final_member_allocations AS (
  SELECT DISTINCT ON (member_id)
    member_id,
    paid_by_month
  FROM allocation_states
  ORDER BY member_id, donation_seq DESC
),
legacy_totals AS (
  SELECT
    (items.key || '-01')::date AS month,
    SUM(items.value::numeric)::numeric AS collected_amount
  FROM final_member_allocations f
  CROSS JOIN LATERAL jsonb_each_text(f.paid_by_month) items
  CROSS JOIN report_window w
  WHERE (items.key || '-01')::date BETWEEN w.window_start AND w.window_end
  GROUP BY items.key
),
donation_totals AS (
  SELECT month, SUM(collected_amount)::numeric AS collected_amount
  FROM (
    SELECT month, collected_amount FROM allocated_totals
    UNION ALL
    SELECT month, collected_amount FROM legacy_totals
  ) u
  GROUP BY month
),
expense_totals AS (
  SELECT
    date_trunc('month', e.date)::date AS month,
    COALESCE(SUM(e.amount), 0)::numeric AS expense_amount
  FROM public.expenses e
  CROSS JOIN report_window w
  WHERE e.date >= w.window_start
  GROUP BY date_trunc('month', e.date)::date
)
SELECT
  at.month,
  at.target_amount,
  COALESCE(dt.collected_amount, 0)::numeric AS collected_amount,
  GREATEST(at.target_amount - COALESCE(dt.collected_amount, 0), 0)::numeric AS due_amount,
  CASE
    WHEN at.target_amount > 0
      THEN ROUND((COALESCE(dt.collected_amount, 0) / at.target_amount) * 100, 2)
    ELSE 0
  END::numeric AS collection_rate,
  at.active_members,
  COALESCE(et.expense_amount, 0)::numeric AS expense_amount,
  (COALESCE(dt.collected_amount, 0) - COALESCE(et.expense_amount, 0))::numeric AS net_balance
FROM active_targets at
LEFT JOIN donation_totals dt ON dt.month = at.month
LEFT JOIN expense_totals et ON et.month = at.month
CROSS JOIN report_window w
WHERE at.month BETWEEN w.window_start AND w.window_end
ORDER BY at.month;

GRANT SELECT ON public.monthly_collection_summary TO authenticated;
NOTIFY pgrst, 'reload schema';
