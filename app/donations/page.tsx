"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, FileText, Loader2, Search, Share2, Trash2, X, Plus } from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
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
  const { user, role } = useAuth();
  const isStaff = hasStaffRole(role, user?.email);
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
    try {
      const response = await fetch(receiptUrl, { credentials: "same-origin" });
      if (!response.ok) throw new Error("রসিদ তৈরি করা যায়নি");
      const blob = await response.blob();
      const file = new File([blob], `Receipt-${donation.receipt_no || donation.id}.jpg`, { type: blob.type || "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) return navigator.share({ title: "Foundation Receipt", text: `রসিদ নং #${donation.receipt_no || "—"}`, files: [file] });
      if (navigator.share) return navigator.share({ title: "Foundation Receipt", text: `রসিদ নং #${donation.receipt_no || "—"}`, url: receiptUrl });
      window.open(`https://wa.me/?text=${encodeURIComponent(`রসিদ নং #${donation.receipt_no || "—"}\n${receiptUrl}`)}`, "_blank", "noopener,noreferrer");
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

  return <main className="min-h-screen bg-[#F8FAFC] pb-16">
    <div className="bg-white border-b border-gray-100 sticky top-0 z-20"><div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="flex items-center gap-2"><FileText className="text-emerald-600" size={23} /><h1 className="text-xl md:text-2xl font-black text-gray-900">অনুদান ও জমার হিসাব</h1></div><p className="text-xs text-gray-500 mt-1">এখানে শুধু জমার রেকর্ড দেখা ও যাচাই করা যায়</p></div><Link href="/joma" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-sm font-black shadow-lg shadow-emerald-200 active:scale-[.98] transition-all"><Plus size={17} /> জমা এন্ট্রি পেজে যান</Link></div></div>
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-400 font-bold">দেখানো রেকর্ড</p><p className="text-2xl font-black text-gray-900 mt-1">{filtered.length}</p></div><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-400 font-bold">মোট জমা (extra সহ)</p><p className="text-2xl font-black text-emerald-600 mt-1">{money(total)}</p></div><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-400 font-bold">যার মধ্যে extra</p><p className="text-2xl font-black text-amber-600 mt-1">{money(extra)}</p></div><div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-400 font-bold">Workflow</p><p className="text-sm font-black text-gray-900 mt-2">/joma only</p></div></div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 grid md:grid-cols-[1fr_180px_180px] gap-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="সদস্য, ফোন বা রসিদ দিয়ে খুঁজুন" className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></div><select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none"><option value="all">সব মাস</option>{months.map((month) => <option key={month} value={month}>{month}</option>)}</select><select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} className="px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none"><option value="all">সব পদ্ধতি</option><option value="cash">নগদ</option><option value="bkash">বিকাশ</option><option value="nagad">নগদ (Nagad)</option><option value="bank">ব্যাংক</option></select></div>
      {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold">{error}</div>}
      {loading ? <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-emerald-600" size={34} /></div> : filtered.length === 0 ? <div className="bg-white rounded-3xl border border-dashed border-gray-200 py-20 text-center"><Search className="mx-auto text-gray-300" size={36} /><p className="mt-3 font-black text-gray-800">কোনো জমা পাওয়া যায়নি</p><p className="text-sm text-gray-400 mt-1">Filter পরিবর্তন করুন অথবা /joma থেকে নতুন জমা করুন</p></div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((donation) => <article key={donation.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-gray-900">{donation.members?.name || "সদস্য"}</h2><p className="text-xs text-gray-400 mt-1">{donation.members?.phone || ""}</p></div><p className="text-lg font-black text-emerald-600">{money(Number(donation.amount) || 0)}</p></div><div className="mt-4 space-y-2 text-xs text-gray-500"><div className="flex justify-between"><span>রসিদ</span><b className="text-gray-800">#{donation.receipt_no || "—"}</b></div><div className="flex justify-between"><span>তারিখ</span><b className="text-gray-800">{donation.date}</b></div><div className="flex justify-between"><span>coverage</span><b className="text-gray-800">{(coverageStart(donation) || "—")}{(coverageEnd(donation) && coverageEnd(donation) !== coverageStart(donation)) ? ` – ${coverageEnd(donation)}` : ""}</b></div><div className="flex justify-between"><span>পদ্ধতি</span><b className="uppercase text-gray-800">{donation.method || "cash"}</b></div>{Number(donation.extra_amount || 0) > 0 && <div className="flex justify-between"><span>extra</span><b className="text-amber-600">{money(Number(donation.extra_amount))}</b></div>}</div><div className="flex items-center gap-2 mt-5 pt-4 border-t border-dashed border-gray-100"><button onClick={() => setPreviewUrl(`/api/receipts/${donation.id}`)} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black flex items-center justify-center gap-2"><Eye size={15} /> প্রিভিউ</button><button onClick={() => void handleShare(donation)} className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600" title="শেয়ার"><Share2 size={16} /></button><a href={`/api/receipts/${donation.id}?download=1`} download={`Receipt-${donation.receipt_no || donation.id}.jpg`} className="p-2.5 rounded-xl bg-blue-50 text-blue-600" title="ডাউনলোড"><Download size={16} /></a>{isStaff && <button onClick={() => void handleDelete(donation)} disabled={deletingId === donation.id} className="p-2.5 rounded-xl bg-rose-50 text-rose-600 disabled:opacity-50" title="ডিলিট">{deletingId === donation.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>}</div></article>)}</div>}
    </div>
    {previewUrl && <div className="fixed inset-0 z-50 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col"><div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"><h2 className="font-black">রসিদ প্রিভিউ</h2><button onClick={() => setPreviewUrl(null)} className="p-2 rounded-xl hover:bg-gray-100" aria-label="বন্ধ"><X size={19} /></button></div><iframe src={previewUrl} title="রসিদ প্রিভিউ" className="w-full flex-1 bg-gray-100" /></div></div>}
  </main>;
}
