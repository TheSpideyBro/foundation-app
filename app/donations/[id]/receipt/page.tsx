"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Printer,
  ArrowLeft,
  Shield,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";
import { isStaff as hasStaffRole } from "@/lib/auth";
import {
  formatMoney,
  formatDateBengali,
  numberToWordsBengali,
  monthLabelBengali,
  toBengaliNumber,
  methodLabels,
} from "@/lib/utils";

type Donation = {
  id: string;
  member_id: string;
  amount: number;
  extra_amount: number | null;
  date: string;
  donation_month: string | null;
  donation_end_month: string | null;
  coverage_start_month: string | null;
  coverage_end_month: string | null;
  receipt_no: string | null;
  method: string | null;
  batch_id: string | null;
  members: { name: string | null; phone: string | null }[] | null;
  collector: { name: string | null; members: { name: string | null }[] | null }[] | null;
};

/** Mirrors the month-range display logic of the JPEG receipt generator. */
function monthRangeLabel(start: string | null, end: string | null): string {
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

export default function ReceiptViewPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const isStaff = hasStaffRole(role);

  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Batch-consolidated display (same logic as the JPEG receipt)
  const [batchMonth, setBatchMonth] = useState<string | null>(null);
  const [batchAmount, setBatchAmount] = useState<number | null>(null);
  const [batchReceiptNo, setBatchReceiptNo] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !isStaff) {
      setLoading(false);
      return;
    }
    void loadDonation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isStaff]);

  async function loadDonation() {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase()
      .from("donations")
      .select(
        "id, member_id, amount, extra_amount, date, donation_month, donation_end_month, coverage_start_month, coverage_end_month, receipt_no, method, batch_id, members!member_id(name, phone), collector:users!collected_by(name, members(name))"
      )
      .eq("id", id)
      .maybeSingle();
    if (queryError) {
      setError("রসিদ লোড করা যায়নি: " + queryError.message);
    } else if (data) {
      const d = data as Donation;
      setDonation(d);
      // Same batch consolidation the JPEG receipt applies: a batch_id with no
      // explicit coverage range rolls the whole batch into one month range.
      if (d.batch_id && !d.coverage_start_month) {
        const { data: batchRows } = await supabase()
          .from("donations")
          .select("amount, donation_month, receipt_no")
          .eq("batch_id", d.batch_id)
          .order("donation_month", { ascending: true });
        if (batchRows && batchRows.length > 1) {
          const first = batchRows[0] as { amount: number; donation_month: string; receipt_no: string };
          const last = batchRows[batchRows.length - 1] as { amount: number; donation_month: string };
          setBatchMonth(
            `${monthLabelBengali(first.donation_month)} – ${monthLabelBengali(last.donation_month)} (${toBengaliNumber(
              String(batchRows.length).padStart(2, "0")
            )} মাস)`
          );
          setBatchAmount(
            batchRows.reduce((sum: number, r: { amount: number }) => sum + Number(r.amount), 0)
          );
          setBatchReceiptNo(`${(d.receipt_no || "").split("-")[0]} (Batch)`);
        }
      }
    }
    setLoading(false);
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-600 shadow-xl shadow-red-100">
          <Shield size={40} />
        </div>
        <h1 className="mb-2 font-tiro text-2xl font-bold text-gray-900">
          প্রবেশাধিকার সংরক্ষিত
        </h1>
        <p className="max-w-xs text-gray-500">
          এই রসিদ পেজটি শুধুমাত্র অ্যাডমিন ও ট্রেজারারদের জন্য। আপনার যদি মনে
          হয় এটি ভুল, তবে প্রধান অ্যাডমিনের সাথে যোগাযোগ করুন।
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-gray-500">
        <Loader2 className="animate-spin" size={24} />
        রসিদ লোড হচ্ছে…
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="mb-2 font-tiro text-2xl font-bold text-gray-900">
          রসিদ পাওয়া যায়নি
        </h1>
        <p className="text-gray-500">{error || "এই আইডির কোনো দান পাওয়া যায়নি।"}</p>
        <Link href="/donations" className="btn-outline mt-6 inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          জমা তালিকায় ফিরুন
        </Link>
      </div>
    );
  }

  const amount = batchAmount ?? Number(donation.amount);
  const monthLabel =
    batchMonth ??
    monthRangeLabel(
      donation.coverage_start_month || donation.donation_month,
      donation.coverage_end_month ||
        donation.donation_end_month ||
        donation.coverage_start_month ||
        donation.donation_month
    );
  const receiptNo = batchReceiptNo ?? donation.receipt_no;
  const collectorName =
    donation.collector?.[0]?.members?.[0]?.name ||
    donation.collector?.[0]?.name ||
    "অ্যাডমিন";

  const rows: Array<[string, string]> = [
    ["রসিদ নং", receiptNo || "—"],
    ["জনাব/জনাবা", donation.members?.[0]?.name || "অজ্ঞাত"],
    ["তারিখ", formatDateBengali(donation.date)],
    ["মাসের নাম", monthLabel],
    ["টাকার পরিমাণ কথায়", `${numberToWordsBengali(amount)} টাকা`],
    ["টাকার পরিমাণ", formatMoney(amount)],
    ...(donation.extra_amount && Number(donation.extra_amount) > 0
      ? [["অতিরিক্ত", formatMoney(Number(donation.extra_amount))] as [string, string]]
      : []),
    ["মাধ্যম", donation.method ? methodLabels[donation.method] || donation.method : "—"],
    ["আদায়কারী", collectorName],
  ];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .receipt-print { box-shadow: none !important; border: 1px solid #064E3B !important; max-width: 148mm; margin: 0 auto; }
          body { background: #fff !important; }
        }
      `}</style>
      <div className="mx-auto max-w-2xl px-4 py-6 font-hind">
        <div className="no-print mb-4 flex items-center justify-between">
          <Link href="/donations" className="btn-outline inline-flex items-center gap-2">
            <ArrowLeft size={16} />
            জমা তালিকা
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-emerald inline-flex items-center gap-2"
          >
            <Printer size={16} />
            প্রিন্ট করুন
          </button>
        </div>

        <article className="receipt-print overflow-hidden rounded-2xl bg-white shadow-xl">
          <header className="bg-gradient-to-b from-[#022C22] to-[#064E3B] px-6 py-6 text-center">
            <h1 className="font-tiro text-xl font-bold text-white">
              দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন
            </h1>
            <p className="mt-1 text-sm text-emerald-100">দান রসিদ</p>
            <div className="mx-auto mt-3 h-0.5 w-24 bg-[#C9A227]" />
          </header>

          <dl className="px-6 py-4">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 border-b border-dashed border-gray-100 py-3 last:border-0"
              >
                <dt className="shrink-0 text-sm text-gray-500">{label}</dt>
                <dd className="text-right text-sm font-semibold text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>

          <footer className="px-6 pb-6 text-center">
            <p className="text-sm text-[#064E3B]">আপনার মহানুভবতার জন্য ধন্যবাদ!</p>
            <p className="mt-1 text-xs text-gray-500">আল্লাহ আপনার দান কবুল করুন</p>
            {donation.receipt_no && (
              <Link
                href={`/verify/${donation.receipt_no}`}
                className="no-print mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#059669] underline underline-offset-4"
              >
                যাচাই লিংক
                <ExternalLink size={14} />
              </Link>
            )}
          </footer>
        </article>
      </div>
    </>
  );
}
