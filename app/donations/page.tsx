"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, FileText, Loader2, Search, Share2, Trash2, X, Plus } from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { currentMonthStr, formatDateBengali, methodLabels, monthLabelBengali } from "@/lib/utils";
import { useAuth } from "@/components/providers";
import { isStaff as hasStaffRole } from "@/lib/auth";
import { monthRange } from "@/lib/payment-ledger";

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

  useEffect(() => { void loadDonations(); }, []);

  async function loadDonations() {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase().from("donations").select("id, member_id, amount, extra_amount, date, donation_month, donation_end_month, coverage_start_month, coverage_end_month, receipt_no, method, batch_id, members(name, phone)").order("date", { ascending: false });
    if (queryError) setError(queryError.message);
    setDonations((data || []) as Donation[]);
    setLoading(false);
  }

  async function handleShare(donation: Donation) {
    const receiptUrl = `${window.location.origin}/api/receipts/${donation.id}`;
    // Public verify link: the raw /api/receipts/{id} URL 401s for anyone
    // without a session, so recipients could never open it. /verify/{receipt_no}
    // is public and shows the same receipt.
    const verifyUrl = donation.receipt_no ? `${window.location.origin}/verify/${encodeURIComponent(donation.receipt_no)}` : null;
    const shareUrl = verifyUrl || receiptUrl;
    try {
      const response = await fetch(receiptUrl, { credentials: "same-origin" });
      if (!response.ok) throw new Error("রসিদ তৈরি করা যায়নি");
      const blob = await response.blob();
      const file = new File([blob], `Receipt-${donation.receipt_no || donation.id}.jpg`, { type: blob.type || "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) return navigator.share({ title: "রসিদ", text: `রসিদ নং #${donation.receipt_no || "—"}`, files: [file] });
      if (navigator.share) return navigator.share({ title: "রসিদ", text: `রসিদ নং #${donation.receipt_no || "—"}`, url: shareUrl });
      window.open(`https://wa.me/?text=${encodeURIComponent(`রসিদ নং #${donation.receipt_no || "—"}\n${shareUrl}`)}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) window.alert(err instanceof Error ? err.message : "রসিদ শেয়ার করা যায়নি");
    }
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
    <div className="bg-white border-b border-gray-100 sticky top-0 z-20"><div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="flex items-center gap-2"><FileText className="text-emerald-600" size={23} /><h1 className="text-xl md:text-2xl font-black text-gray-900">অনুদান ও জমার হিসাব</h1></div><p className="text-xs text-gray-500 mt-1">এখানে শুধু জমার রেকর্ড দেখা ও যাচাই করা যায়</p></div><Link href="/joma" className="btn-emerald text-sm"><Plus size={17} /> জমা এন্ট্রি পেজে যান</Link></div></div>
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-400 font-bold">দেখানো রেকর্ড</p><p className="text-2xl font-black text-gray-900 mt-1">{filtered.length}</p></div><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-400 font-bold">মোট জমা (extra সহ)</p><p className="text-2xl font-black text-emerald-600 mt-1">{money(total)}</p></div><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-400 font-bold">যার মধ্যে extra</p><p className="text-2xl font-black text-amber-600 mt-1">{money(extra)}</p></div><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-400 font-bold">এই মাসের জমা</p><p className="text-2xl font-black text-blue-600 mt-1">{money(thisMonthTotal)}</p></div></div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 grid md:grid-cols-[1fr_180px_180px] gap-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="সদস্য, ফোন বা রসিদ দিয়ে খুঁজুন" className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></div><select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none"><option value="all">সব মাস</option>{months.map((month) => <option key={month} value={month}>{monthLabelBengali(month)}</option>)}</select><select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} className="px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none"><option value="all">সব পদ্ধতি</option>{Object.entries(methodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold">{error}</div>}
      {loading ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-3xl p-5 border border-gray-100 space-y-3" aria-hidden="true"><div className="h-5 bg-gray-100 rounded-lg w-2/3 animate-pulse" /><div className="h-3 bg-gray-100 rounded-lg w-1/3 animate-pulse" /><div className="h-3 bg-gray-100 rounded-lg w-full animate-pulse" /><div className="h-3 bg-gray-100 rounded-lg w-full animate-pulse" /><div className="h-9 bg-gray-100 rounded-xl w-full animate-pulse" /></div>)}</div> : filtered.length === 0 ? <div className="bg-white rounded-3xl border border-dashed border-gray-200 py-20 text-center"><Search className="mx-auto text-gray-300" size={36} /><p className="mt-3 font-black text-gray-800">কোনো জমা পাওয়া যায়নি</p><p className="text-sm text-gray-400 mt-1">ফিল্টার পরিবর্তন করে আবার দেখুন</p><Link href="/joma" className="btn-emerald inline-flex mt-5 mx-auto"><Plus size={16} /> নতুন জমা করুন</Link></div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((donation) => <article key={donation.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-gray-900">{donation.members?.name || "সদস্য"}</h2><p className="text-xs text-gray-400 mt-1">{donation.members?.phone || ""}</p></div><p className="text-lg font-black text-emerald-600">{money(Number(donation.amount) || 0)}</p></div><div className="mt-4 space-y-2 text-xs text-gray-500"><div className="flex justify-between"><span>রসিদ</span><b className="text-gray-800">#{donation.receipt_no || "—"}</b></div><div className="flex justify-between"><span>তারিখ</span><b className="text-gray-800">{donation.date ? formatDateBengali(donation.date) : "—"}</b></div><div className="flex justify-between"><span>মাস</span><b className="text-gray-800">{coverageLabel(donation)}</b></div><div className="flex justify-between"><span>পদ্ধতি</span><b className="text-gray-800">{methodLabels[donation.method || "cash"] ?? "ক্যাশ"}</b></div>{Number(donation.extra_amount || 0) > 0 && <div className="flex justify-between"><span>অতিরিক্ত জমা</span><b className="text-amber-600">{money(Number(donation.extra_amount))}</b></div>}</div><div className="flex items-center gap-2 mt-5 pt-4 border-t border-dashed border-gray-100"><Link href={`/donations/${donation.id}/receipt`} className="btn-emerald text-xs" style={{ minHeight: 0, padding: "10px 12px", borderRadius: "12px" }}><FileText size={15} /> রসিদ দেখুন</Link><button onClick={() => setPreviewUrl(`/api/receipts/${donation.id}`)} className="btn-outline text-xs" style={{ minHeight: 0, padding: "10px 12px", borderRadius: "12px" }} aria-label="প্রিভিউ"><Eye size={15} /> প্রিভিউ</button><button onClick={() => void handleShare(donation)} className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600" title="শেয়ার" aria-label="শেয়ার"><Share2 size={16} /></button><a href={`/api/receipts/${donation.id}?download=1`} download={`Receipt-${donation.receipt_no || donation.id}.jpg`} className="p-2.5 rounded-xl bg-blue-50 text-blue-600" title="ডাউনলোড" aria-label="ডাউনলোড"><Download size={16} /></a>{isStaff && <button onClick={() => void handleDelete(donation)} disabled={deletingId === donation.id} className="p-2.5 rounded-xl bg-rose-50 text-rose-600 disabled:opacity-50" title="ডিলিট" aria-label="ডিলিট">{deletingId === donation.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>}</div></article>)}</div>}
    </div>
    {previewUrl && <div className="fixed inset-0 z-50 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col"><div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"><h2 className="font-black">রসিদ প্রিভিউ</h2><button onClick={() => setPreviewUrl(null)} className="p-2 rounded-xl hover:bg-gray-100" aria-label="বন্ধ"><X size={19} /></button></div><iframe src={previewUrl} title="রসিদ প্রিভিউ" className="w-full flex-1 bg-gray-100">রসিদ লোড করা যায়নি</iframe></div></div>}
  </main>;
}
