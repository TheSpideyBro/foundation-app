export type PledgeHistoryEntry = {
  member_id?: string | null;
  monthly_amount: number | string;
  effective_from_month: string;
};

export type LedgerDonation = {
  id: string;
  member_id?: string | null;
  amount: number | string;
  date: string;
  method?: string | null;
  receipt_no?: string | null;
  donation_month?: string | null;
  donation_end_month?: string | null;
  coverage_start_month?: string | null;
  coverage_end_month?: string | null;
  note?: string | null;
};

export type PaymentAllocation = {
  id?: string;
  payment_id: string;
  member_id?: string | null;
  month: string | null;
  amount: number;
  allocation_type: 'pledge' | 'advance' | 'unallocated';
  note?: string | null;
};

export type LedgerMonth = {
  month: string;
  expected: number;
  paid: number;
  remaining: number;
  unallocated: number;
  status: "paid" | "partial" | "due" | "overpaid";
  donations: LedgerDonation[];
};

export type MonthlyCoverageSummary = {
  month: string;
  target_amount: number;
  collected_amount: number;
};

export type AllocationResult = {
  allocations: Array<{ month: string | null; amount: number; allocationType: 'pledge' | 'advance' | 'unallocated' }>;
  allocatedAmount: number;
  unallocatedAmount: number;
};

export function monthRange(start: string, end = start): string[] {
  if (!start) return [];
  const [sy, sm] = start.slice(0, 7).split("-").map(Number);
  const [ey, em] = (end || start).slice(0, 7).split("-").map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const result: string[] = [];
  let year = sy;
  let month = sm;
  while (year < ey || (year === ey && month <= em)) {
    result.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) { month = 1; year += 1; }
    if (result.length > 120) break;
  }
  return result;
}

/**
 * Determine the coverage month range for a donation.
 * Prefers explicit coverage_start_month/coverage_end_month, falls back to
 * donation_month/donation_end_month.
 */
export function getCoverageMonths(donation: LedgerDonation): string[] {
  const start = donation.coverage_start_month || donation.donation_month || donation.date;
  const end = donation.coverage_end_month || donation.donation_end_month || start;
  return monthRange(start, end);
}

export function donationMonths(donation: LedgerDonation): string[] {
  return getCoverageMonths(donation);
}

export function resolvePledgeForMonth(
  month: string,
  fallbackMonthlyPledge: number | string | null | undefined,
  history: PledgeHistoryEntry[] = [],
): number {
  const applicable = history
    .filter((entry) => entry.effective_from_month <= month)
    .sort((a, b) => b.effective_from_month.localeCompare(a.effective_from_month))[0];
  return Math.max(0, Number(applicable?.monthly_amount ?? fallbackMonthlyPledge ?? 0) || 0);
}

export function pledgeBreakdown(
  startMonth: string,
  endMonth: string,
  fallbackMonthlyPledge: number | string | null | undefined,
  history: PledgeHistoryEntry[] = [],
): Array<{ month: string; expected: number }> {
  return monthRange(startMonth, endMonth).map((month) => ({
    month,
    expected: resolvePledgeForMonth(month, fallbackMonthlyPledge, history),
  }));
}

/**
 * Canonical allocation engine.
 *
 * Given a payment amount and coverage range, calculates how much of the
 * payment is allocated to each month and what remains unallocated.
 *
 * - Each month gets up to its effective pledge amount (from history or fallback).
 * - Any leftover after all covered months is marked 'unallocated'.
 * - The total allocated + unallocated equals the payment amount.
 * - No silent auto-advance: excess is NEVER pushed to a future month.
 */
export function calculatePaymentAllocation(
  paymentAmount: number,
  coverageStart: string,
  coverageEnd: string,
  monthlyPledge: number | string | null | undefined,
  pledgeHistory: PledgeHistoryEntry[] = [],
): AllocationResult {
  // Clamp to zero — negative amounts are invalid
  const clampedAmount = Math.max(0, paymentAmount);
  const months = monthRange(coverageStart, coverageEnd);
  if (months.length === 0) {
    return {
      allocations: [],
      allocatedAmount: 0,
      unallocatedAmount: 0,
    };
  }

  const allocations: AllocationResult['allocations'] = [];
  let remaining = clampedAmount;
  let allocatedTotal = 0;

  for (const month of months) {
    const pledge = resolvePledgeForMonth(month, monthlyPledge, pledgeHistory);
    const allocated = Math.min(remaining, Math.max(0, pledge));
    remaining -= allocated;
    allocatedTotal += allocated;

    if (allocated > 0) {
      allocations.push({
        month,
        amount: allocated,
        allocationType: 'pledge' as const,
      });
    }
  }

  // Any remaining amount after all covered months
  if (remaining > 0) {
    allocations.push({
      month: null,
      amount: remaining,
      allocationType: 'unallocated' as const,
    });
  }

  return {
    allocations,
    allocatedAmount: allocatedTotal,
    unallocatedAmount: remaining,
  };
}

/**
 * Build a member ledger from donations.
 *
 * If the donations have coverage_start_month / coverage_end_month fields,
 * each donation is allocated using calculatePaymentAllocation() so that
 * extra cash never silently advances into future months.
 *
 * Falls back to the old per-donation allocation for legacy records without
 * coverage fields.
 */
export function buildMemberLedger(
  donations: LedgerDonation[],
  monthlyPledge: number | string,
  startMonth: string,
  endMonth: string,
  pledgeHistory: PledgeHistoryEntry[] = [],
): LedgerMonth[] {
  const requestedMonths = monthRange(startMonth, endMonth);
  if (!requestedMonths.length) return [];

  const allDonationMonths = donations.flatMap(d => getCoverageMonths(d));
  const calculationStart = allDonationMonths.length
    ? ([startMonth, ...allDonationMonths].sort()[0])
    : startMonth;
  const calculationEnd = allDonationMonths.length
    ? ([endMonth, ...allDonationMonths].sort().at(-1) || endMonth)
    : endMonth;
  const months = monthRange(calculationStart, calculationEnd);

  const ledger = months.map((month) => {
    const expected = resolvePledgeForMonth(month, monthlyPledge, pledgeHistory);
    return { month, expected, paid: 0, remaining: expected, unallocated: 0, status: "due" as const, donations: [] as LedgerDonation[] };
  });
  const byMonth = new Map(ledger.map((row) => [row.month, row]));

  // Track which donations we've already processed per month to avoid double-counting
  const processedDonationMonths = new Map<string, Set<string>>(); // month -> Set of donation ids

  [...donations]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((donation) => {
      const donationId = donation.id;
      const coveredMonths = getCoverageMonths(donation).filter((m) => byMonth.has(m));
      if (coveredMonths.length === 0) return;

      const existingProcessed = processedDonationMonths.get(coveredMonths[0]) || new Set();

      // Check if this donation was already partially/fully processed via the
      // old allocation path (for legacy compatibility). Skip if fully processed.
      if (existingProcessed.has(donationId)) return;

      const paymentAmount = Number(donation.amount) || 0;
      if (paymentAmount <= 0) return;

      // Use canonical allocation: each month gets its pledge, leftovers go to unallocated
      const allocation = calculatePaymentAllocation(
        paymentAmount,
        coveredMonths[0],
        coveredMonths[coveredMonths.length - 1],
        monthlyPledge,
        pledgeHistory,
      );

      // Track processed
      if (!processedDonationMonths.has(coveredMonths[0])) {
        processedDonationMonths.set(coveredMonths[0], new Set());
      }
      processedDonationMonths.get(coveredMonths[0])!.add(donationId);

      for (const alloc of allocation.allocations) {
        if (alloc.month === null) {
          // Unallocated — attach to last covered month's unallocated bucket
          const lastRow = byMonth.get(coveredMonths[coveredMonths.length - 1]);
          if (lastRow) {
            lastRow.unallocated += alloc.amount;
            if (!lastRow.donations.some((item) => item.id === donationId)) {
              lastRow.donations.push(donation);
            }
          }
        } else {
          const row = byMonth.get(alloc.month);
          if (!row) continue;
          // Only allocate what hasn't already been covered by this month
          const available = Math.max(0, row.expected - row.paid);
          const actual = Math.min(alloc.amount, available);
          if (actual > 0) {
            row.paid += actual;
            if (!row.donations.some((item) => item.id === donationId)) {
              row.donations.push(donation);
            }
          }
        }
      }
    });

  const requested = new Set(requestedMonths);
  return ledger
    .filter((row) => requested.has(row.month))
    .map((row) => ({
      ...row,
      remaining: Math.max(0, row.expected - row.paid),
      status: row.unallocated > 0 || row.paid > row.expected
        ? "overpaid"
        : row.paid === row.expected && row.expected > 0
          ? "paid"
          : row.paid > 0
            ? "partial"
            : "due",
    }));
}

/**
 * Build a member ledger from PERSISTED payment_allocations.
 *
 * This is the preferred path: the `payment_allocations` table is the single
 * source of truth for monthly collected amounts, so reports and ledgers should
 * read from it directly and the UI, ledger, and database never disagree.
 *
 * - 'pledge' and 'advance' allocations with a concrete month count as `paid`.
 * - 'unallocated' allocations (month === null) are surfaced as extra cash on
 *   the donation's last covered month within the requested window — never
 *   counted as paid and never advanced into a future month.
 *
 * Legacy fallback (clearly isolated per §52 of the spec): any donation that has
 * NOT been backfilled into `payment_allocations` yet is allocated on the fly
 * with the same canonical engine (`calculatePaymentAllocation`). This keeps the
 * ledger correct during the transition window before `backfill_payment_allocations()`
 * has run, without maintaining a second accounting rule. Once every donation is
 * backfilled, this branch is never exercised.
 *
 * `donations` resolves each allocation's coverage window, attaches the
 * underlying donation record to its ledger rows, and drives the fallback.
 */
export function buildMemberLedgerFromAllocations(
  allocations: PaymentAllocation[],
  donations: LedgerDonation[],
  monthlyPledge: number | string,
  startMonth: string,
  endMonth: string,
  pledgeHistory: PledgeHistoryEntry[] = [],
): LedgerMonth[] {
  const requestedMonths = monthRange(startMonth, endMonth);
  if (!requestedMonths.length) return [];

  const donationById = new Map(donations.map((d) => [d.id, d]));

  const ledger = requestedMonths.map((month) => {
    const expected = resolvePledgeForMonth(month, monthlyPledge, pledgeHistory);
    return { month, expected, paid: 0, remaining: expected, unallocated: 0, status: "due" as const, donations: [] as LedgerDonation[] };
  });
  const byMonth = new Map(ledger.map((row) => [row.month, row]));

  const attachDonation = (row: LedgerMonth, paymentId: string) => {
    const donation = donationById.get(paymentId);
    if (donation && !row.donations.some((item) => item.id === paymentId)) {
      row.donations.push(donation);
    }
  };

  const applyExtra = (paymentId: string, amount: number, month: string | null) => {
    const donation = donationById.get(paymentId);
    const covered = donation ? getCoverageMonths(donation).filter((m) => byMonth.has(m)) : [];
    const targetMonth = month && byMonth.has(month) ? month : covered[covered.length - 1];
    const row = targetMonth ? byMonth.get(targetMonth) : undefined;
    if (row) {
      row.unallocated += amount;
      attachDonation(row, paymentId);
    }
  };

  // 1. Persisted allocations — the source of truth.
  const backfilledPaymentIds = new Set<string>();
  for (const alloc of allocations) {
    backfilledPaymentIds.add(alloc.payment_id);
    const amount = Number(alloc.amount) || 0;
    if (amount <= 0) continue;

    if (alloc.allocation_type === "unallocated" || alloc.month === null) {
      applyExtra(alloc.payment_id, amount, alloc.month);
      continue;
    }

    // 'pledge' / 'advance' — real coverage for a concrete month
    const row = byMonth.get(alloc.month);
    if (!row) continue;
    row.paid += amount;
    attachDonation(row, alloc.payment_id);
  }

  // 2. Legacy fallback — donations not yet in payment_allocations.
  for (const donation of donations) {
    if (backfilledPaymentIds.has(donation.id)) continue;
    const paymentAmount = Number(donation.amount) || 0;
    if (paymentAmount <= 0) continue;

    const covered = getCoverageMonths(donation);
    if (!covered.length) continue;

    const result = calculatePaymentAllocation(
      paymentAmount,
      covered[0],
      covered[covered.length - 1],
      monthlyPledge,
      pledgeHistory,
    );
    for (const alloc of result.allocations) {
      if (alloc.month === null) {
        applyExtra(donation.id, alloc.amount, null);
      } else {
        const row = byMonth.get(alloc.month);
        if (!row) continue;
        row.paid += alloc.amount;
        attachDonation(row, donation.id);
      }
    }
  }

  return ledger.map((row) => ({
    ...row,
    remaining: Math.max(0, row.expected - row.paid),
    status: row.unallocated > 0 || row.paid > row.expected
      ? "overpaid"
      : row.paid === row.expected && row.expected > 0
        ? "paid"
        : row.paid > 0
          ? "partial"
          : "due",
  }));
}

export function buildMonthlyCoverageSummary(
  months: string[],
  members: Array<{ id: string; monthly_pledge?: number | string | null; join_date?: string | null; status?: string | null }>,
  donations: LedgerDonation[],
  pledgeHistory: PledgeHistoryEntry[] = [],
): MonthlyCoverageSummary[] {
  return months.map((month) => {
    const activeMembers = members.filter((member) =>
      member.status !== "inactive" && (!member.join_date || member.join_date.slice(0, 7) <= month),
    );
    const target_amount = activeMembers.reduce(
      (sum, member) => sum + resolvePledgeForMonth(month, member.monthly_pledge, pledgeHistory.filter((entry) => entry.member_id === member.id)),
      0,
    );
    const collected_amount = activeMembers.reduce((sum, member) => {
      const memberDonations = donations.filter((donation) => donation.member_id === member.id);
      const row = buildMemberLedger(
        memberDonations,
        member.monthly_pledge || 0,
        month,
        month,
        pledgeHistory.filter((entry) => entry.member_id === member.id),
      )[0];
      return sum + (row?.paid || 0);
    }, 0);
    return { month, target_amount, collected_amount };
  });
}

export function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
}
