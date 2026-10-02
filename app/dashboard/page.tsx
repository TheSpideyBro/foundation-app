"use client";

import { useState, useEffect } from "react";
import { currentMonthStr, monthLabelBengali } from "@/lib/utils";
import { 
  Users, CreditCard, Wallet, Landmark,
  ArrowUpRight, ArrowDownRight,
  RefreshCw, Activity,
  Plus
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { isStaff as hasStaffRole } from "@/lib/auth";

export default function Dashboard() {
  const { role } = useAuth();
  // Role gates are purely role-based (lib/auth) — resolved from users.role.
  const isStaffView = hasStaffRole(role);
  const [stats, setStats] = useState({
    totalMembers: 0,
    currentCollection: 0,
    currentDue: 0,
    netCashBalance: 0,
    bankBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [role]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const thisMonth = currentMonthStr();
      const [
        { data: noticeData },
        { data: memberSummary },
        { data: donationRows },
        { data: expenseRows },
        { data: bankTxns },
        { data: accounts },
        { data: monthlySummary },
      ] = await Promise.all([
        supabase().from("notices").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(3),
        supabase().from("member_summary").select("total_members").single(),
        supabase().from("donations").select("amount, date").order("date", { ascending: true }),
        supabase().from("expenses").select("amount").order("date", { ascending: true }),
        supabase().from("account_transactions").select("amount, account_id, accounts!inner(type)").eq("direction", "in").eq("accounts.type", "bank"),
        supabase().from("accounts").select("id, type, opening_balance").eq("is_active", true),
        supabase().from("monthly_collection_summary").select("month, due_amount").eq("month", `${thisMonth}-01`).maybeSingle(),
      ]);

      setNotices(noticeData || []);
      const donations = (donationRows || []) as Array<{ amount: number | string; date: string }>;
      const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const totalExpenses = ((expenseRows || []) as Array<{ amount: number | string }>).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalBankDeposits = ((bankTxns || []) as Array<{ amount: number | string }>).reduce((sum, t) => sum + Number(t.amount || 0), 0);

      // Current month collection
      const monthDonations = donations.filter((d) => (d.date || "").slice(0, 7) === thisMonth);
      const currentCollection = monthDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);

      // Bank balance: opening + deposits (via account_balances logic)
      let bankBalance = 0;
      for (const acc of (accounts || []) as Array<{ id: string; type: string; opening_balance: number | string }>) {
        if (acc.type !== "bank") continue;
        bankBalance += Number(acc.opening_balance || 0);
      }
      bankBalance += totalBankDeposits;
      // Subtract bank outflows
      const { data: bankOut } = await supabase().from("account_transactions").select("amount, accounts!inner(type)").eq("direction", "out").eq("accounts.type", "bank");
      bankBalance -= ((bankOut || []) as Array<{ amount: number | string }>).reduce((sum, t) => sum + Number(t.amount || 0), 0);

      setStats({
        totalMembers: Number(memberSummary?.total_members) || 0,
        currentCollection,
        currentDue: Number((monthlySummary as any)?.due_amount) || 0,
        netCashBalance: totalDonations - totalExpenses - totalBankDeposits,
        bankBalance,
      });


    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoadError(error instanceof Error ? error.message : "ড্যাশবোর্ড লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync-sheets", { method: "POST" });
      if (res.ok) alert("গুগল শিট সফলভাবে আপডেট হয়েছে!");
      else alert("সিঙ্ক ব্যর্থ হয়েছে!");
    } catch (error) {
      alert("সিঙ্ক ব্যর্থ হয়েছে!");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="touch-spacing animate-slide-up pb-8 px-1 sm:px-0">
      {loadError && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-bold text-rose-700 text-sm">ড্যাশবোর্ড লোড করা যায়নি</p>
            <p className="text-xs text-rose-600 mt-0.5">{loadError} — পুরো পাতায় শূন্য মান দেখানো হচ্ছে, সঠিক নয়।</p>
          </div>
          <button onClick={fetchDashboardData} className="btn-outline text-xs shrink-0">
            <RefreshCw size={14} /> আবার চেষ্টা করুন
          </button>
        </div>
      )}
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1 font-shadhinata">আসসালামু আলাইকুম!</h1>
          <p className="text-sm text-gray-500 font-medium">আজকের ফাউন্ডেশন কার্যক্রমের চিত্র।</p>
        </div>
        {isStaffView && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 sm:flex-none btn-outline h-12 px-5"
            >
              <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">শিট সিঙ্ক</span>
              <span className="sm:hidden">সিঙ্ক</span>
            </button>
            <Link href="/joma" className="flex-1 sm:flex-none btn-emerald h-12 px-5">
              <Plus size={18} />
              <span className="hidden sm:inline">নতুন জমা</span>
              <span className="sm:hidden">নতুন দান</span>
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 mb-4"><div><h2 className="text-xl sm:text-2xl font-bold font-shadhinata text-gray-900">সংগ্রহের সারাংশ</h2><p className="text-xs sm:text-sm text-gray-500">সর্বশেষ তথ্য — {monthLabelBengali(currentMonthStr())}</p></div></div>
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {[{ label: "এই মাসে সংগ্রহ", value: stats.currentCollection, icon: CreditCard, color: "bg-emerald-600" }, { label: "এই মাসে বকেয়া", value: stats.currentDue, icon: ArrowDownRight, color: "bg-rose-600" }, { label: "নেট ক্যাশ ব্যালেন্স", value: stats.netCashBalance, icon: Wallet, color: "bg-blue-600" }, { label: "ব্যাংক ব্যালেন্স", value: stats.bankBalance, icon: Landmark, color: "bg-amber-600" }].map((stat) => <div key={stat.label} className="card-premium p-4 sm:p-6 group border border-emerald-50/50"><div className="flex items-center justify-between mb-3"><div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-xl flex items-center justify-center text-white`}><stat.icon size={21} /></div></div><h3 className="text-gray-500 text-[10px] sm:text-[11px] font-bold mb-1">{stat.label}</h3><p className="text-xl sm:text-2xl font-bold text-gray-900 font-baloo truncate">৳{stat.value.toLocaleString("bn-BD")}</p></div>)}
      </div>

      {/* Notices Section */}
      {notices.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
            <h2 className="text-xl font-bold font-shadhinata text-gray-900">সর্বশেষ ঘোষণা</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notices.map((n) => (
              <div key={n.id} className="card-premium p-6 bg-emerald-50/30 border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-700 mb-3">
                  <Activity size={16} />
                  <span className="text-[10px] font-bold">{new Date(n.created_at).toLocaleDateString('bn-BD')}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 font-shadhinata">{n.title}</h3>
                <p className="text-xs text-gray-600 line-clamp-2">{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Foundation Status */}
      <div className="mt-4 sm:mt-8">
        <div className="card-premium p-6 sm:p-8 bg-[#064E3B] text-white border-none overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <h3 className="text-lg sm:text-xl font-bold font-shadhinata mb-6 sm:mb-8">ফাউন্ডেশন স্ট্যাটাস</h3>
            <div className="grid grid-cols-2 gap-6 sm:gap-8">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                  <Activity size={20} className="sm:hidden" />
                  <Activity size={24} className="hidden sm:block" />
                </div>
                <div>
                  <p className="text-white/50 text-[8px] sm:text-[10px] font-bold mb-0.5 sm:mb-1">বর্তমান ব্যালেন্স</p>
                  <p className="text-xl sm:text-3xl font-bold font-baloo">৳{stats.netCashBalance.toLocaleString('bn-BD')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                  <Users size={20} className="sm:hidden" />
                  <Users size={24} className="hidden sm:block" />
                </div>
                <div>
                  <p className="text-white/50 text-[8px] sm:text-[10px] font-bold mb-0.5 sm:mb-1">সক্রিয় সদস্য</p>
                  <p className="text-xl sm:text-3xl font-bold font-baloo">{stats.totalMembers}</p>
                </div>
              </div>
            </div>
            <div className="pt-4 sm:pt-6">
              <Link href="/reports" className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-white/10 hover:bg-white/20 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all border border-white/10">
                পূর্ণাঙ্গ রিপোর্ট দেখুন <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
