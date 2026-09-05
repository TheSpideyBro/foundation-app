"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Shield, TrendingDown, TrendingUp, Minus, RefreshCw } from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";

type PledgeEntry = {
  id: string;
  member_id: string;
  monthly_amount: number | string;
  effective_from_month: string;
  note?: string | null;
  created_at?: string;
  members?: { name?: string } | { name?: string }[] | null;
};

export default function AdminPledgeHistoryPage() {
  const { user, role } = useAuth();
  const isStaff = role === "admin" || role === "treasurer" || user?.email === "saddamakash234@gmail.com";
  const [entries, setEntries] = useState<PledgeEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    if (!isStaff) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase()
      .from("member_pledge_history")
      .select("id, member_id, monthly_amount, effective_from_month, note, created_at, members(name)")
      .order("effective_from_month", { ascending: false });
    if (queryError) setError(queryError.message);
    setEntries((data || []) as PledgeEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [isStaff]);

  const visibleEntries = useMemo(() => entries.filter((entry) => {
    const member = Array.isArray(entry.members) ? entry.members[0]?.name : entry.members?.name;
    return !search || String(member || "অজ্ঞাত সদস্য").toLowerCase().includes(search.toLowerCase());
  }), [entries, search]);

  const formatMonth = (value: string) => new Date(`${value}-01T00:00:00`).toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
  const getMemberName = (entry: PledgeEntry) => Array.isArray(entry.members) ? entry.members[0]?.name || "অজ্ঞাত সদস্য" : entry.members?.name || "অজ্ঞাত সদস্য";

  if (!isStaff) {
    return <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center"><div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6"><Shield size={40} /></div><h1 className="text-2xl font-bold font-tiro text-gray-900 mb-2">প্রবেশাধিকার সংরক্ষিত</h1><p className="text-gray-500 max-w-xs">এই পেজটি শুধুমাত্র অ্যাডমিন ও ট্রেজারারদের জন্য।</p></div>;
  }

  return <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 touch-spacing">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><h1 className="text-3xl sm:text-4xl font-bold font-tiro text-gray-900 mb-1">মাসিক অঙ্গীকার পরিবর্তনের ইতিহাস</h1><p className="text-sm text-gray-500 font-medium">কোন মাস থেকে pledge amount পরিবর্তন হয়েছে এবং পরিবর্তনের কারণ দেখুন</p></div>
      <button type="button" onClick={loadHistory} className="btn-outline h-11 px-4"><RefreshCw size={17} /> রিফ্রেশ</button>
    </div>

    <div className="card-premium p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
      <div className="flex items-center gap-3 text-sm font-bold text-gray-600"><span className="text-emerald-600">মোট পরিবর্তন: {entries.length}</span><span className="text-gray-300">|</span><span>দেখানো হচ্ছে: {visibleEntries.length}</span></div>
      <div className="relative w-full sm:w-80"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="সদস্যের নাম খুঁজুন..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm" /></div>
    </div>

    {error && <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold">ইতিহাস লোড করা যায়নি: {error}</div>}
    <div className="card-premium overflow-hidden border border-emerald-50 shadow-sm">
      {loading ? <div className="p-12 flex justify-center"><RefreshCw className="animate-spin text-emerald-600" /></div> : visibleEntries.length === 0 ? <p className="p-12 text-center text-sm text-gray-400">কোনো pledge history পাওয়া যায়নি</p> : <div className="divide-y divide-gray-100">{visibleEntries.map((entry) => {
        const memberEntries = entries.filter((item) => item.member_id === entry.member_id).sort((a, b) => b.effective_from_month.localeCompare(a.effective_from_month));
        const previous = memberEntries.find((item) => item.effective_from_month < entry.effective_from_month);
        const previousAmount = previous ? Number(previous.monthly_amount) : null;
        const currentAmount = Number(entry.monthly_amount) || 0;
        const change = previousAmount === null ? null : currentAmount - previousAmount;
        const ChangeIcon = change === null ? Minus : change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
        return <div key={entry.id} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-emerald-50/30 transition-colors"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold font-tiro text-gray-900">{getMemberName(entry)}</h2>{change !== null && <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${change > 0 ? "bg-emerald-50 text-emerald-700" : change < 0 ? "bg-rose-50 text-rose-700" : "bg-gray-100 text-gray-600"}`}><ChangeIcon size={13} />{change > 0 ? "বৃদ্ধি" : change < 0 ? "হ্রাস" : "অপরিবর্তিত"}</span>}</div><p className="text-xs text-gray-500 mt-1">কার্যকর মাস: <span className="font-bold text-gray-700">{formatMonth(entry.effective_from_month)}</span></p><p className="text-sm text-gray-600 mt-2">নোট: {entry.note || "নোট দেওয়া হয়নি"}</p></div><div className="flex items-center gap-4 shrink-0">{previousAmount !== null && <span className="text-sm text-gray-400">৳{previousAmount.toLocaleString("bn-BD")} থেকে</span>}<span className="text-lg font-black text-emerald-600">৳{currentAmount.toLocaleString("bn-BD")}</span></div></div>;
      })}</div>}
    </div>
  </div>;
}
