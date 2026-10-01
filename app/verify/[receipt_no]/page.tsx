import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, SearchX, Home } from "lucide-react";
import {
  toBengaliNumber,
  formatMoney,
  formatDateBengali,
  numberToWordsBengali,
  monthLabelBengali,
} from "@/lib/utils";

export const metadata: Metadata = {
  title: "রসিদ যাচাই",
  description:
    "দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশনের দানের রসিদ যাচাই করুন।",
};

/**
 * Server-side Supabase client with the service-role key.
 *
 * The /verify page is public (no login), and there is no public RLS policy
 * for donations — so the lookup runs server-side with the privileged key,
 * exactly like app/api/payments/route.ts does. The key never reaches the
 * browser because this is a Server Component. Only the fields needed for
 * verification are selected, and the donor name is masked below.
 */
function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

type VerifyDonation = {
  receipt_no: string | null;
  amount: number;
  date: string;
  donation_month: string | null;
  donation_end_month: string | null;
  coverage_start_month: string | null;
  coverage_end_month: string | null;
  members: { name: string | null } | null;
  collector: { name: string | null; members: { name: string | null } | null } | null;
};

/**
 * Privacy: never expose the full donor name on the public page.
 * Shows the first 3 Unicode code points (Array.from is code-point aware,
 * so Bangla conjuncts/surrogate pairs aren't split) followed by bullets.
 */
function maskName(name: string | null | undefined): string {
  const clean = (name ?? "").trim();
  if (!clean) return "অজ্ঞাত";
  return `${Array.from(clean).slice(0, 3).join("")}•••`;
}

/** "জানুয়ারি ২০২৬" or "জানুয়ারি ২০২৬ – মার্চ ২০২৬ (০৩ মাস)". */
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

function BrandHeader() {
  return (
    <div className="bg-gradient-to-b from-[#022C22] to-[#064E3B] px-6 py-6 text-center">
      <p className="font-tiro text-lg font-bold text-white">
        দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন
      </p>
      <div className="mx-auto mt-3 h-0.5 w-24 bg-[#C9A227]" />
    </div>
  );
}

function NotFoundCard() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FDFDFC] p-4 font-hind">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#C9A227]/40 bg-white shadow-xl">
        <BrandHeader />
        <div className="px-6 py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <SearchX size={32} />
          </div>
          <h1 className="font-tiro text-2xl font-bold text-gray-900">
            রসিদ পাওয়া যায়নি
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            এই রসিদ নম্বরের কোনো রেকর্ড আমাদের কাছে নেই। নম্বরটি আবার দেখে
            চেষ্টা করুন।
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#064E3B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#022C22]"
          >
            <Home size={16} />
            হোমে ফিরুন
          </Link>
        </div>
      </div>
    </main>
  );
}

function ServiceDownCard() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FDFDFC] p-4 font-hind">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#C9A227]/40 bg-white shadow-xl">
        <BrandHeader />
        <div className="px-6 py-8 text-center">
          <h1 className="font-tiro text-2xl font-bold text-gray-900">
            যাচাই করা যাচ্ছে না
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            যাচাই সেবা এখন সাময়িকভাবে অনুপলব্ধ। কিছুক্ষণ পর আবার চেষ্টা করুন।
          </p>
        </div>
      </div>
    </main>
  );
}

export default async function VerifyReceiptPage({
  params,
}: {
  params: Promise<{ receipt_no: string }>;
}) {
  const { receipt_no } = await params;
  const client = serviceClient();
  if (!client) return <ServiceDownCard />;

  const { data, error } = await client
    .from("donations")
    .select(
      "receipt_no, amount, date, donation_month, donation_end_month, coverage_start_month, coverage_end_month, members!member_id(name), collector:users!collected_by(name, members(name))"
    )
    .eq("receipt_no", receipt_no.trim())
    .maybeSingle();

  const donation = data as VerifyDonation | null;
  if (error || !donation) return <NotFoundCard />;

  const amount = Number(donation.amount) || 0;
  const coverageStart =
    donation.coverage_start_month || donation.donation_month;
  const coverageEnd =
    donation.coverage_end_month || donation.donation_end_month || coverageStart;
  const collectorName =
    donation.collector?.members?.name ||
    donation.collector?.name ||
    "অ্যাডমিন";

  const rows: Array<[string, ReactNode]> = [
    ["রসিদ নং", <span key="r" className="font-bold text-[#064E3B]">{donation.receipt_no}</span>],
    ["দাতার নাম", maskName(donation.members?.name)],
    ["টাকার পরিমাণ", <span key="a" className="font-bold">{formatMoney(amount)}</span>],
    ["কথায়", `${numberToWordsBengali(amount)} টাকা`],
    ["মাসের নাম", monthRangeLabel(coverageStart, coverageEnd)],
    ["তারিখ", formatDateBengali(donation.date)],
    ["আদায়কারী", collectorName],
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FDFDFC] p-4 font-hind">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#C9A227]/40 bg-white shadow-xl">
        <BrandHeader />
        <div className="px-6 py-6">
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/60 bg-emerald-50 px-4 py-1.5 text-sm font-bold text-[#064E3B]">
              <CheckCircle2 size={18} />
              ✅ যাচাইকৃত রসিদ
            </span>
          </div>
          <dl className="divide-y divide-dashed divide-gray-100">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-sm text-gray-500">{label}</dt>
                <dd className="text-right text-sm text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 rounded-xl bg-emerald-50/60 px-4 py-3 text-center text-xs leading-relaxed text-[#064E3B]">
            এই রসিদটি ফাউন্ডেশনের অফিসিয়াল রেকর্ড থেকে যাচাই করা হয়েছে।
            দাতার গোপনীয়তা রক্ষায় নাম আংশিক দেখানো হয়েছে।
          </p>
        </div>
      </div>
    </main>
  );
}
