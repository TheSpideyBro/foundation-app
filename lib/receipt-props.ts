import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatMoney,
  formatDateBengali,
  numberToWordsBengali,
  monthLabelBengali,
  toBengaliNumber,
  methodLabels,
} from "@/lib/utils";
import type { ReceiptPaperProps } from "@/components/ReceiptPaper";

export type ReceiptDonation = {
  id: string;
  member_id: string;
  amount: number | string;
  extra_amount: number | string | null;
  date: string;
  donation_month: string | null;
  donation_end_month: string | null;
  coverage_start_month: string | null;
  coverage_end_month: string | null;
  receipt_no: string | null;
  method: string | null;
  batch_id: string | null;
  members: { name: string | null; phone: string | null }[] | null;
  collector:
    | { name: string | null; members: { name: string | null }[] | null }[]
    | null;
};

export type BatchConsolidation = {
  batchMonth: string | null;
  batchAmount: number | null;
  batchReceiptNo: string | null;
};

/** Mirrors the month-range display logic of the JPEG receipt generator. */
export function monthRangeLabel(
  start: string | null,
  end: string | null
): string {
  const s = start;
  const e = end && end !== s ? end : s;
  if (!s) return "—";
  if (!e || e === s) return monthLabelBengali(s);
  const [sy, sm] = s.split("-").map(Number);
  const [ey, em] = e.split("-").map(Number);
  const count = Math.max(1, (ey - sy) * 12 + em - sm + 1);
  return `${monthLabelBengali(s)} – ${monthLabelBengali(e)} (${toBengaliNumber(
    String(count).padStart(2, "0")
  )} মাস)`;
}

/** Full donation row for the receipt — staff and members (own rows, RLS) may load. */
export async function fetchDonationForReceipt(
  client: SupabaseClient,
  id: string
): Promise<ReceiptDonation | null> {
  const { data, error } = await client
    .from("donations")
    .select(
      "id, member_id, amount, extra_amount, date, donation_month, donation_end_month, coverage_start_month, coverage_end_month, receipt_no, method, batch_id, members!member_id(name, phone), collector:users!collected_by(name, members(name))"
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as ReceiptDonation;
}

/**
 * Same batch consolidation the legacy JPEG receipt applies: a batch_id with
 * no explicit coverage range rolls the whole batch into one month range.
 */
export async function fetchBatchConsolidation(
  client: SupabaseClient,
  donation: ReceiptDonation
): Promise<BatchConsolidation> {
  const empty: BatchConsolidation = {
    batchMonth: null,
    batchAmount: null,
    batchReceiptNo: null,
  };
  if (!donation.batch_id || donation.coverage_start_month) return empty;
  const { data: batchRows } = await client
    .from("donations")
    .select("amount, donation_month, receipt_no")
    .eq("batch_id", donation.batch_id)
    .eq("member_id", donation.member_id)
    .order("donation_month", { ascending: true });
  if (!batchRows || batchRows.length <= 1) return empty;
  // Unique months only: two rows covering the same month must not inflate
  // the "(০৩ মাস)" label. Null months are skipped safely.
  const months = Array.from(
    new Set(
      batchRows.map(
        (r) => (r as { donation_month: string | null }).donation_month
      )
    )
  )
    .filter((m): m is string => !!m)
    .sort();
  const out: BatchConsolidation = { ...empty };
  if (months.length > 0) {
    out.batchMonth = `${monthLabelBengali(months[0])} – ${monthLabelBengali(
      months[months.length - 1]
    )} (${toBengaliNumber(String(months.length).padStart(2, "0"))} মাস)`;
  }
  out.batchAmount = batchRows.reduce(
    (sum: number, r: { amount: number }) => sum + Number(r.amount),
    0
  );
  out.batchReceiptNo = donation.receipt_no
    ? `${donation.receipt_no} (ব্যাচ)`
    : null;
  return out;
}

/** Robustly extract collector name from Supabase join (object or array). */
export function getCollectorName(collector: unknown): string {
  const c = Array.isArray(collector) ? collector[0] : (collector as any);
  if (!c) return "অ্যাডমিন";
  const m = Array.isArray(c.members) ? c.members[0] : c.members;
  return m?.name || c.name || "অ্যাডমিন";
}

/** Pure builder: donation row (+ optional batch rollup) → ReceiptPaper props. */
export function buildReceiptPaperProps(
  donation: ReceiptDonation,
  batch: BatchConsolidation,
  verifyUrl: string | null
): ReceiptPaperProps {
  const amount = batch.batchAmount ?? Number(donation.amount);
  const monthLabel =
    batch.batchMonth ??
    monthRangeLabel(
      donation.coverage_start_month || donation.donation_month,
      donation.coverage_end_month ||
        donation.donation_end_month ||
        donation.coverage_start_month ||
        donation.donation_month
    );
  return {
    receiptNo: batch.batchReceiptNo ?? donation.receipt_no,
    dateLabel: formatDateBengali(donation.date),
    amountLabel: formatMoney(amount),
    amountWords: numberToWordsBengali(amount),
    donorName: donation.members?.[0]?.name || "অজ্ঞাত",
    monthLabel,
    methodLabel: donation.method
      ? methodLabels[donation.method] || donation.method
      : "—",
    collectorName: getCollectorName(donation.collector),
    extraAmountLabel:
      donation.extra_amount && Number(donation.extra_amount) > 0
        ? formatMoney(Number(donation.extra_amount))
        : null,
    verifyUrl,
  };
}
