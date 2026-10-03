"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, FileText, Loader2, Search, Share2, Trash2, X, Plus, MessageCircle, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { currentMonthStr, formatDateBengali, methodLabels, monthLabelBengali } from "@/lib/utils";
import { useAuth } from "@/components/providers";
import Modal from "@/components/Modal";
import ReceiptJpegButton from "@/components/ReceiptJpegButton";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import { isStaff as hasStaffRole } from "@/lib/auth";
import { monthRange } from "@/lib/payment-ledger";
import { exportToExcel } from "@/lib/export";

type Donation = {
  id: string;
  member_id: string;
  amount: number | string;
  extra_amount?: number | string | null;
  date: string;
  donation_month?: string | null;
  donation_end_month?: string | null;
  coverage_start_month?: string | null;
  coverage_end_month?: string | null;
  receipt_no?: string | null;
  method?: string | null;
  batch_id?: string | null;
  members?: { name?: string | null; phone?: string | null } | null;
  // F3: latest WhatsApp delivery status
  wa_status?: "sent" | "failed" | "skipped" | null;
  wa_detail?: string | null;
};

const money = (value: number) => `৳${Math.round(value).toLocaleString("bn-BD")}`;

export default function DonationsPage() {
  const { role } = useAuth();
  const isStaff = hasStaffRole(role);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // F3: donationId -> latest WhatsApp delivery status

  useEffect(() => { void loadDonations(); }, []);

  async function loadDonations() {
    setLoading(true);
    setError(null);
    // Fetch donations first
    const { data: donationsData, error: queryError } = await supabase()
      .from("donations")
      .select("id, member_id, amount, extra_amount, date, donation_month, donation_end_month, coverage_start_month, coverage_end_month, receipt_no, method, batch_id, members(name, phone)")
      .order("date", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    // Fetch latest notification status per donation
    const donationIds = (donationsData || []).map((d) => d.id);
    const notificationsMap = new Map<string, { status: string; detail: string | null }>();
    if (donationIds.length > 0) {
      const { data: notifs } = await supabase()
        .from("notifications")
        .select("donation_id, status, error, created_at")
        .in("donation_id", donationIds)
        .eq("channel", "whatsapp")
        .order("created_at", { ascending: false });

      // Keep only the latest per donation
      for (const n of notifs || []) {
        if (!notificationsMap.has(n.donation_id)) {
          notificationsMap.set(n.donation_id, { status: n.status, detail: n.error });
        }
      }
    }

    const donationsWithStatus = (donationsData || []).map((d) => ({
      ...d,
      wa_status: notificationsMap.get(d.id)?.status ?? null,
      wa_detail: notificationsMap.get(d.id)?.detail ?? null,
    }));

    setDonations(donationsWithStatus as Donation[]);
    setLoading(false);
  }

async function handleDelete(donation: Donation) {
    // RLS only allows staff to delete — hide the button instead of showing a
    // permanently failing control to members.
    if (!isStaff || deletingId) return;
    if (!window.confirm(`রসিদ ${donation.receipt_no || "—"} ডিলিট করতে চান? এটি coverage হিসাবেও প্রভাব ফেলবে।`)) return;
    setDeletingId(donation.id);
    try {
      const { error: deleteError } = await supabase().from("donations").delete().eq("id", donation.id);
      if (deleteError) {
        setError("ডিলিট করতে সমস্যা হয়েছে: " + deleteError.message);
      } else {
        setError(null);
        await loadDonations();
      }
    } finally {
      setDeletingId(null);
    }
  }

  // Coverage window of a payment: explicit coverage columns first, then the
  // legacy donation_month/donation_end_month pair.
  const coverageStart = (d: Donation) => d.coverage_start_month || d.donation_month || d.date?.slice(0, 7) || null;
  const coverageLabel = (d: Donation) => {
    const start = coverageStart(d);
    if (!start) return "—";
    const end = coverageEnd(d);
    return monthLabelBengali(start) + (end && end !== start ? ` – ${monthLabelBengali(end)}` : "");
  };
  const coverageEnd = (d: Donation) => d.coverage_end_month || d.donation_end_month || coverageStart(d);
  const coversMonth = (d: Donation, month: string) => {
    const start = coverageStart(d);
    if (!start) return false;
    return monthRange(start, coverageEnd(d) || start).includes(month);
  };

  const months = useMemo(() => {
    const all = new Set<string>();
    for (const item of donations) {
      const start = coverageStart(item);
      if (!start) continue;
      for (const m of monthRange(start, coverageEnd(item) || start)) all.add(m);
    }
    return Array.from(all).sort().reverse();
  }, [donations]);

  // WhatsApp delivery status badge
  function WaStatusBadge({ status, detail }: { status: string | null; detail: string | null }) {
    if (!status) return null;
    switch (status) {
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            <CheckCircle2 size={10} /> পাঠানো হয়েছে
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold" title={detail || "পাঠানো ব্যর্থ"}>
            <AlertCircle size={10} /> ব্যর্থ
          </span>
        );
      case "skipped":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold" title={detail || "পাঠানো হয়নি"}>
            <Clock size={10} /> বাদ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
            <XCircle size={10} /> অজানা
          </span>
        );
    }
  }

  const filtered = useMemo(() => donations.filter((donation) => {
    const haystack = `${donation.members?.name || ""} ${donation.members?.phone || ""} ${donation.receipt_no || ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase())
      && (monthFilter === "all" || coversMonth(donation, monthFilter))
      && (methodFilter === "all" || donation.method === methodFilter);
  }), [donations, search, monthFilter, methodFilter]);
  // donations.amount ALREADY includes extra_amount (save_payment_entry stores
  // amount = regular + extra) — summing both here used to overstate cash.
  const total = filtered.reduce((sum, donation) => sum + Number(donation.amount || 0), 0);
  const extra = filtered.reduce((sum, donation) => sum + Number(donation.extra_amount || 0), 0);
  const thisMonth = currentMonthStr();
  const thisMonthTotal = donations.filter((donation) => (donation.date || "").slice(0, 7) === thisMonth).reduce((sum, donation) => sum + Number(donation.amount || 0), 0);

  return <main className="min-h-screen bg-[#F8FAFC] pb-16">
    <div className="bg-white border-b border-gray-100 sticky top-16 lg:top-0 z-20"><div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="flex items-center gap-2"><FileText className="text-emerald-700" size={23} /><h1 className="text-xl md:text-2xl font-bold text-gray-900">অনুদান ও জমার হিসাব</h1></div><p className="text-xs text-gray-500 mt-1">এখানে শুধু জমার রেকর্ড দেখা ও যাচাই করা যায়</p></div><div className="flex items-center gap-2"><button onClick={() => exportToExcel(filtered.map((d) => ({ রসিদ: d.receipt_no, সদস্য: d.members?.name, টাকা: d.amount, তারিখ: d.date, মাস: d.donation_month, পদ্ধতি: d.method })), "joma-report")} className="btn-outline text-sm" title="Excel ডাউনলোড"><Download size={16} /> Excel</button><Link href="/joma" className="btn-emerald text-sm"><Plus size={17} /> জমা এন্ট্রি পেজে যান</Link></div></div></div>
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-500 font-bold">দেখানো রেকর্ড</p><p className="text-2xl font-bold text-gray-900 mt-1">{filtered.length}</p></div><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-500 font-bold">মোট জমা (অতিরিক্তসহ)</p><p className="text-2xl font-bold text-emerald-700 mt-1">{money(total)}</p></div><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-500 font-bold">যার মধ্যে অতিরিক্ত</p><p className="text-2xl font-bold text-amber-600 mt-1">{money(extra)}</p></div><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-500 font-bold">এই মাসের জমা</p><p className="text-2xl font-bold text-blue-600 mt-1">{money(thisMonthTotal)}</p></div></div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 grid md:grid-cols-[1fr_180px_180px] gap-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="সদস্য, ফোন বা রসিদ দিয়ে খুঁজুন" aria-label="সদস্য, ফোন বা রসিদ দিয়ে খুঁজুন" className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></div><select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} aria-label="মাস অনুযায়ী ফিল্টার" className="px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none"><option value="all">সব মাস</option>{months.map((month) => <option key={month} value={month}>{monthLabelBengali(month)}</option>)}</select><select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} aria-label="পদ্ধতি অনুযায়ী ফিল্টার" className="px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none"><option value="all">সব পদ্ধতি</option>{Object.entries(methodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold">{error}</div>}
      {loading ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-3xl p-5 border border-gray-100 space-y-3" aria-hidden="true"><div className="h-5 bg-gray-100 rounded-lg w-2/3 animate-pulse" /><div className="h-3 bg-gray-100 rounded-lg w-1/3 animate-pulse" /><div className="h-3 bg-gray-100 rounded-lg w-full animate-pulse" /><div className="h-3 bg-gray-100 rounded-lg w-full animate-pulse" /><div className="h-9 bg-gray-100 rounded-xl w-full animate-pulse" /></div>)}</div> : filtered.length === 0 ? <div className="bg-white rounded-3xl border border-dashed border-gray-200 py-20 text-center"><Search className="mx-auto text-gray-300" size={36} /><p className="mt-3 font-bold text-gray-800">কোনো জমা পাওয়া যায়নি</p><p className="text-sm text-gray-500 mt-1">ফিল্টার পরিবর্তন করে আবার দেখুন</p><Link href="/joma" className="btn-emerald inline-flex mt-5 mx-auto"><Plus size={16} /> নতুন জমা করুন</Link></div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((donation) => <article key={donation.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-gray-900">{donation.members?.name || "সদস্য"}</h2><p className="text-xs text-gray-500 mt-1">{donation.members?.phone || ""}</p></div><div className="flex items-center gap-2"><WaStatusBadge status={donation.wa_status ?? null} detail={donation.wa_detail ?? null} /><p className="text-lg font-bold text-emerald-700">{money(Number(donation.amount) || 0)}</p></div></div><div className="mt-4 space-y-2 text-xs text-gray-500"><div className="flex justify-between"><span>রসিদ</span><b className="text-gray-800 min-w-0 text-right">#{donation.receipt_no || "—"}</b></div><div className="flex justify-between"><span>তারিখ</span><b className="text-gray-800 min-w-0 text-right">{donation.date ? formatDateBengali(donation.date) : "—"}</b></div><div className="flex justify-between"><span>মাস</span><b className="text-gray-800 min-w-0 text-right">{coverageLabel(donation)}</b></div><div className="flex justify-between"><span>পদ্ধতি</span><b className="text-gray-800 min-w-0 text-right">{methodLabels[donation.method || "cash"] ?? "ক্যাশ"}</b></div>{Number(donation.extra_amount || 0) > 0 && <div className="flex justify-between"><span>অতিরিক্ত জমা</span><b className="text-amber-600 min-w-0 text-right">{money(Number(donation.extra_amount))}</b></div>}</div><div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-dashed border-gray-100"><Link href={`/donations/${donation.id}/receipt`} className="btn-emerald text-xs"><FileText size={15} /> রসিদ দেখুন</Link><button onClick={() => setPreviewUrl(`/donations/${donation.id}/receipt?embed=1`)} className="btn-outline text-xs" aria-label="প্রিভিউ"><Eye size={15} /> প্রিভিউ</button><ReceiptJpegButton donationId={donation.id} mode="share" className="p-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 disabled:opacity-50" title="রসিদ শেয়ার (JPG)" ariaLabel="রসিদ শেয়ার"><Share2 size={16} /></ReceiptJpegButton><WhatsAppShareButton donationId={donation.id} phone={donation.members?.phone} memberName={donation.members?.name} receiptNo={donation.receipt_no} amount={Number(donation.amount) || 0} monthLabel={coverageLabel(donation)} className="p-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-green-50 text-green-600 disabled:opacity-50" title="WhatsApp-এ পাঠান" ariaLabel="WhatsApp-এ রসিদ পাঠান" /><ReceiptJpegButton donationId={donation.id} mode="download" className="p-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 disabled:opacity-50" title="রসিদ ডাউনলোড (JPG)" ariaLabel="রসিদ ডাউনলোড"><Download size={16} /></ReceiptJpegButton>
{isStaff && <button onClick={() => void handleDelete(donation)} disabled={deletingId === donation.id} className="p-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 disabled:opacity-50" title="ডিলিট" aria-label="ডিলিট">{deletingId === donation.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>}</div></article>)}</div>}
    </div>
    <Modal open={previewUrl !== null} onClose={() => setPreviewUrl(null)} label="রসিদ প্রিভিউ" panelClassName="w-full max-w-4xl h-[85vh] flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold">রসিদ প্রিভিউ</h2>
        <button onClick={() => setPreviewUrl(null)} className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl hover:bg-gray-100" aria-label="বন্ধ"><X size={19} /></button>
      </div>
      {previewUrl && <iframe src={previewUrl} title="রসিদ প্রিভিউ" className="w-full flex-1 bg-gray-100">রসিদ লোড করা যায়নি</iframe>}
    </Modal>
  </main>;
}
