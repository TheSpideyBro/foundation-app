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
};

export type LedgerMonth = {
  month: string;
  expected: number;
  paid: number;
  remaining: number;
  status: "paid" | "partial" | "due" | "overpaid";
  donations: LedgerDonation[];
};

export type MonthlyCoverageSummary = {
  month: string;
  target_amount: number;
  collected_amount: number;
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

export function donationMonths(donation: LedgerDonation): string[] {
  return monthRange(
    donation.donation_month || donation.date,
    donation.donation_end_month || donation.donation_month || donation.date,
  );
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

export function buildMemberLedger(
  donations: LedgerDonation[],
  monthlyPledge: number | string,
  startMonth: string,
  endMonth: string,
  pledgeHistory: PledgeHistoryEntry[] = [],
): LedgerMonth[] {
  const requestedMonths = monthRange(startMonth, endMonth);
  if (!requestedMonths.length) return [];
  const allDonationMonths = donations.flatMap(donationMonths);
  const calculationStart = allDonationMonths.length ? ([startMonth, ...allDonationMonths].sort()[0]) : startMonth;
  const calculationEnd = allDonationMonths.length ? ([endMonth, ...allDonationMonths].sort().at(-1) || endMonth) : endMonth;
  const months = monthRange(calculationStart, calculationEnd);
  const ledger = months.map((month) => {
    const expected = resolvePledgeForMonth(month, monthlyPledge, pledgeHistory);
    return { month, expected, paid: 0, remaining: expected, status: "due" as const, donations: [] as LedgerDonation[] };
  });
  const byMonth = new Map(ledger.map((row) => [row.month, row]));
  [...donations]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((donation) => {
      let remaining = Number(donation.amount) || 0;
      const coveredMonths = donationMonths(donation).filter((month) => byMonth.has(month));
      coveredMonths.forEach((month) => {
        const row = byMonth.get(month);
        if (!row || remaining <= 0) return;
        const allocation = Math.min(remaining, Math.max(0, row.expected - row.paid));
        if (allocation > 0) {
          row.paid += allocation;
          row.donations.push(donation);
          remaining -= allocation;
        }
      });
      if (remaining > 0 && coveredMonths.length) {
        const lastRow = byMonth.get(coveredMonths[coveredMonths.length - 1]);
        if (lastRow) {
          lastRow.paid += remaining;
          if (!lastRow.donations.some((item) => item.id === donation.id)) lastRow.donations.push(donation);
        }
      }
    });
  const requested = new Set(requestedMonths);
  return ledger
    .filter((row) => requested.has(row.month))
    .map((row) => ({
      ...row,
      remaining: Math.max(0, row.expected - row.paid),
      status: row.paid > row.expected
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
