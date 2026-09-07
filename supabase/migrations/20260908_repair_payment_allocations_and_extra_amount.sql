-- Repair migration for environments where the allocation migrations were not applied.
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS extra_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS donations_extra_amount_check;
ALTER TABLE public.donations ADD CONSTRAINT donations_extra_amount_check CHECK (extra_amount >= 0);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('pledge', 'advance', 'unallocated')),
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_allocations_payment_month_type UNIQUE (payment_id, month, allocation_type)
);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_member_month ON public.payment_allocations(member_id, month);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_month ON public.payment_allocations(month);
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_allocations_select_staff ON public.payment_allocations;
DROP POLICY IF EXISTS payment_allocations_insert_staff ON public.payment_allocations;
DROP POLICY IF EXISTS payment_allocations_delete_admin ON public.payment_allocations;
CREATE POLICY payment_allocations_select_staff ON public.payment_allocations FOR SELECT USING (get_my_role() = ANY (ARRAY['admin','treasurer']));
CREATE POLICY payment_allocations_insert_staff ON public.payment_allocations FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['admin','treasurer']));
CREATE POLICY payment_allocations_delete_admin ON public.payment_allocations FOR DELETE USING (get_my_role() = 'admin');
GRANT SELECT, INSERT ON public.payment_allocations TO authenticated;

CREATE OR REPLACE FUNCTION public.calculate_payment_allocation(
  p_payment_id UUID, p_member_id UUID, p_payment_amount NUMERIC,
  p_coverage_start TEXT, p_coverage_end TEXT, p_pledge_history JSONB
) RETURNS TABLE(month TEXT, amount NUMERIC, allocation_type TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  month_cursor TEXT; month_start DATE; month_end DATE; pledge_amount NUMERIC; remaining NUMERIC; allocated NUMERIC;
BEGIN
  IF p_coverage_start IS NULL OR p_coverage_end IS NULL OR p_coverage_start > p_coverage_end OR p_payment_amount < 0 THEN RETURN; END IF;
  month_start := to_date(p_coverage_start, 'YYYY-MM'); month_end := to_date(p_coverage_end, 'YYYY-MM'); remaining := p_payment_amount;
  FOR month_cursor IN SELECT to_char(d, 'YYYY-MM') FROM generate_series(month_start, month_end, INTERVAL '1 month') d LOOP
    SELECT COALESCE((SELECT (elem->>'monthly_amount')::numeric FROM jsonb_array_elements(COALESCE(p_pledge_history, '[]'::jsonb)) elem WHERE elem->>'effective_from_month' <= month_cursor ORDER BY elem->>'effective_from_month' DESC LIMIT 1), (SELECT monthly_pledge::numeric FROM public.members WHERE id = p_member_id), 0) INTO pledge_amount;
    pledge_amount := GREATEST(COALESCE(pledge_amount, 0), 0); allocated := LEAST(remaining, pledge_amount); remaining := remaining - allocated;
    month := month_cursor; amount := allocated; allocation_type := CASE WHEN allocated > 0 THEN 'pledge' ELSE 'unallocated' END; RETURN NEXT;
  END LOOP;
  IF remaining > 0 THEN month := NULL; amount := remaining; allocation_type := 'unallocated'; RETURN NEXT; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.calculate_payment_allocation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_payment_allocation TO authenticated;

CREATE OR REPLACE FUNCTION public.save_payment_entry(
  p_member_id UUID, p_amount NUMERIC, p_extra_amount NUMERIC DEFAULT 0,
  p_date DATE DEFAULT CURRENT_DATE, p_method TEXT DEFAULT 'cash', p_receipt_no TEXT DEFAULT NULL,
  p_coverage_start TEXT DEFAULT NULL, p_coverage_end TEXT DEFAULT NULL, p_collected_by UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL, p_pledge_change_amount NUMERIC DEFAULT NULL,
  p_pledge_effective_month TEXT DEFAULT NULL, p_pledge_change_note TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payment_id UUID; v_actor_id UUID; allocation RECORD; v_pledge_history JSONB;
BEGIN
  v_actor_id := auth.uid(); p_extra_amount := COALESCE(p_extra_amount, 0);
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF p_extra_amount < 0 THEN RAISE EXCEPTION 'Extra amount cannot be negative'; END IF;
  IF p_coverage_start IS NULL OR p_coverage_end IS NULL OR p_coverage_start > p_coverage_end THEN RAISE EXCEPTION 'Coverage month range is required'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('member_id', ph.member_id, 'monthly_amount', ph.monthly_amount, 'effective_from_month', ph.effective_from_month)), '[]'::jsonb) INTO v_pledge_history FROM public.member_pledge_history ph WHERE ph.member_id = p_member_id;
  INSERT INTO public.donations(member_id, amount, extra_amount, date, method, receipt_no, coverage_start_month, coverage_end_month, note, collected_by, created_by) VALUES (p_member_id, p_amount + p_extra_amount, p_extra_amount, p_date, p_method, p_receipt_no, p_coverage_start, p_coverage_end, p_note, p_collected_by, v_actor_id) RETURNING id INTO v_payment_id;
  FOR allocation IN SELECT * FROM public.calculate_payment_allocation(v_payment_id, p_member_id, p_amount, p_coverage_start, p_coverage_end, v_pledge_history) LOOP
    INSERT INTO public.payment_allocations(payment_id, member_id, month, amount, allocation_type, note, created_by) VALUES (v_payment_id, p_member_id, allocation.month, allocation.amount, allocation.allocation_type, p_note, v_actor_id);
  END LOOP;
  IF p_extra_amount > 0 THEN INSERT INTO public.payment_allocations(payment_id, member_id, month, amount, allocation_type, note, created_by) VALUES (v_payment_id, p_member_id, NULL, p_extra_amount, 'unallocated', 'Extra amount', v_actor_id); END IF;
  RETURN v_payment_id;
END; $$;
REVOKE ALL ON FUNCTION public.save_payment_entry(UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_payment_entry(UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.reallocate_payment(p_payment_id UUID, p_amount NUMERIC, p_extra_amount NUMERIC DEFAULT 0, p_coverage_start TEXT DEFAULT NULL, p_coverage_end TEXT DEFAULT NULL, p_note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member_id UUID; v_actor_id UUID; v_pledge_history JSONB; allocation RECORD;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF p_extra_amount IS NULL OR p_extra_amount < 0 THEN RAISE EXCEPTION 'Extra amount cannot be negative'; END IF;
  SELECT member_id INTO v_member_id FROM public.donations WHERE id = p_payment_id FOR UPDATE; IF v_member_id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  v_actor_id := auth.uid(); SELECT COALESCE(jsonb_agg(jsonb_build_object('member_id', ph.member_id, 'monthly_amount', ph.monthly_amount, 'effective_from_month', ph.effective_from_month)), '[]'::jsonb) INTO v_pledge_history FROM public.member_pledge_history ph WHERE ph.member_id = v_member_id;
  UPDATE public.donations SET amount = p_amount + p_extra_amount, extra_amount = p_extra_amount, coverage_start_month = p_coverage_start, coverage_end_month = p_coverage_end, note = p_note WHERE id = p_payment_id;
  DELETE FROM public.payment_allocations WHERE payment_id = p_payment_id;
  FOR allocation IN SELECT * FROM public.calculate_payment_allocation(p_payment_id, v_member_id, p_amount, p_coverage_start, p_coverage_end, v_pledge_history) LOOP INSERT INTO public.payment_allocations(payment_id, member_id, month, amount, allocation_type, note, created_by) VALUES (p_payment_id, v_member_id, allocation.month, allocation.amount, allocation.allocation_type, p_note, v_actor_id); END LOOP;
  IF p_extra_amount > 0 THEN INSERT INTO public.payment_allocations(payment_id, member_id, month, amount, allocation_type, note, created_by) VALUES (p_payment_id, v_member_id, NULL, p_extra_amount, 'unallocated', 'Extra amount', v_actor_id); END IF;
END; $$;
REVOKE ALL ON FUNCTION public.reallocate_payment(UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reallocate_payment(UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
