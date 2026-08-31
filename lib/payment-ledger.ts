export type LedgerDonation = {
  id: string;
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
  return monthRange(donation.donation_month || donation.date, donation.donation_end_month || donation.donation_month || donation.date);
}

export function buildMemberLedger(donations: LedgerDonation[], monthlyPledge: number, startMonth: string, endMonth: string): LedgerMonth[] {
  const months = monthRange(startMonth, endMonth);
  const ledger = months.map((month) => ({ month, expected: Math.max(0, monthlyPledge), paid: 0, remaining: Math.max(0, monthlyPledge), status: "due" as const, donations: [] as LedgerDonation[] }));
  const byMonth = new Map(ledger.map((row) => [row.month, row]));
  [...donations].sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach((donation) => {
    let remaining = Number(donation.amount) || 0;
    donationMonths(donation).forEach((month) => {
      const row = byMonth.get(month);
      if (!row || remaining <= 0) return;
      const allocation = Math.min(remaining, Math.max(0, row.expected - row.paid));
      if (allocation > 0) { row.paid += allocation; row.donations.push(donation); remaining -= allocation; }
    });
  });
  return ledger.map((row) => ({ ...row, remaining: Math.max(0, row.expected - row.paid), status: row.paid > row.expected ? "overpaid" : row.paid === row.expected && row.expected > 0 ? "paid" : row.paid > 0 ? "partial" : "due" }));
}

export function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
}
