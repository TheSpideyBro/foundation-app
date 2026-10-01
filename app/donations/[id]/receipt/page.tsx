"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Printer, ArrowLeft, Shield, Loader2 } from "lucide-react";
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
import ReceiptPaper from "./ReceiptPaper";

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

  const verifyUrl = useMemo(() => {
    if (typeof window === "undefined" || !donation?.receipt_no) return null;
    return `${window.location.origin}/verify/${donation.receipt_no}`;
  }, [donation?.receipt_no]);

  if (!isStaff) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center font-hind">
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
      <div className="flex min-h-[60vh] items-center justify-center gap-2 font-hind text-gray-500">
        <Loader2 className="animate-spin" size={24} />
        রসিদ লোড হচ্ছে…
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="mx-auto max-w-md p-8 text-center font-hind">
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

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .receipt-stage { background: #fff !important; padding: 0 !important; }
          .receipt-paper {
            box-shadow: none !important;
            margin: 0 auto !important;
            max-width: 175mm !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="receipt-stage min-h-screen bg-[#0a0f0d] px-4 py-8 font-hind sm:py-12">
        <div className="no-print mx-auto mb-8 flex max-w-2xl items-center justify-between">
          <Link
            href="/donations"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
          >
            <ArrowLeft size={16} />
            জমা তালিকা
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-[#C9A227] px-5 py-2 text-sm font-bold text-[#022C22] shadow-[0_8px_24px_rgba(201,162,39,0.35)] transition hover:brightness-110"
          >
            <Printer size={16} />
            প্রিন্ট করুন
          </button>
        </div>

        <ReceiptPaper
          receiptNo={batchReceiptNo ?? donation.receipt_no}
          dateLabel={formatDateBengali(donation.date)}
          amountLabel={formatMoney(amount)}
          amountWords={numberToWordsBengali(amount)}
          donorName={donation.members?.[0]?.name || "অজ্ঞাত"}
          monthLabel={monthLabel}
          methodLabel={
            donation.method ? methodLabels[donation.method] || donation.method : "—"
          }
          collectorName={
            donation.collector?.[0]?.members?.[0]?.name ||
            donation.collector?.[0]?.name ||
            "অ্যাডমিন"
          }
          extraAmountLabel={
            donation.extra_amount && Number(donation.extra_amount) > 0
              ? formatMoney(Number(donation.extra_amount))
              : null
          }
          verifyUrl={verifyUrl}
        />

        <p className="no-print mx-auto mt-6 max-w-2xl text-center text-xs text-stone-500">
          প্রিন্ট করলে উপরের বাটনগুলো বাদ যাবে — শুধু রসিদটি কাগজে আসবে।
        </p>
      </div>
    </>
  );
}
