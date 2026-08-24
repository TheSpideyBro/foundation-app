"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { 
  Users, Heart, Wallet, TrendingUp, Calendar, 
  ArrowUpRight, ArrowDownRight, RefreshCw, 
  ExternalLink, ChevronRight, Activity, Award
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { role } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalDonations: 0,
    totalExpenses: 0,
    recentDonations: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { count: totalMembers } = await supabase().from("members").select("*", { count: "exact", head: true });
      const { count: activeMembers } = await supabase().from("members").select("*", { count: "exact", head: true }).eq("status", "active");
      
      const { data: donations } = await supabase().from("donations").select("amount, date, member:members(name)");
      const { data: expenses } = await supabase().from("expenses").select("amount");
      
      const totalDonations = donations?.reduce((sum, d) => sum + d.amount, 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
      
      setStats({
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        totalDonations,
        totalExpenses,
        recentDonations: donations?.slice(0, 5).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || []
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "মোট সদস্য", value: stats.totalMembers, sub: `${stats.activeMembers} জন সক্রিয়`, icon: Users, color: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
    { title: "মোট সংগ্রহ", value: `৳${stats.totalDonations}`, sub: "চলতি বছর", icon: Heart, color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "মোট খরচ", value: `৳${stats.totalExpenses}`, sub: "চলতি বছর", icon: Wallet, color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" },
    { title: "অবশিষ্ট তহবিল", value: `৳${stats.totalDonations - stats.totalExpenses}`, sub: "বর্তমান ব্যালেন্স", icon: Award, color: "bg-purple-500", text: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">ড্যাশবোর্ড সারসংক্ষেপ</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের বর্তমান আর্থিক ও সাংগঠনিক অবস্থা</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            <Calendar size={16} /> আগস্ট, ২০২৬
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map((card, i) => (
          <div key={i} className="card-premium p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 ${card.bg} ${card.text} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                <card.icon size={24} />
              </div>
              <span className="flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight size={12} className="mr-1" /> +12%
              </span>
            </div>
            <h3 className="text-gray-500 text-[13px] font-medium mb-1">{card.title}</h3>
            <p className="text-[24px] font-bold text-gray-900 mb-1">{card.value}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="card-premium overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-emerald-600" />
                <h3 className="font-tiro font-bold text-[18px]">সাম্প্রতিক দান</h3>
              </div>
              <Link href="/donations" className="text-[12px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                সব দেখুন <ChevronRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.recentDonations.map((d, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-gray-800">{d.member?.name}</p>
                      <p className="text-[11px] text-gray-400">{new Date(d.date).toLocaleDateString('bn-BD')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-emerald-600">+ ৳{d.amount}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">সফল</p>
                  </div>
                </div>
              ))}
              {stats.recentDonations.length === 0 && (
                <div className="p-10 text-center text-gray-400 text-[14px]">কোনো রেকর্ড পাওয়া যায়নি</div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions / Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0F2922] rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h3 className="font-tiro text-[22px] font-bold mb-2">গুগল শিট সিঙ্ক</h3>
              <p className="text-white/60 text-[13px] mb-6 leading-relaxed">সব তথ্য রিয়েল-টাইমে গুগল স্প্রেডশিটের সাথে সিঙ্ক করা হচ্ছে।</p>
              <a 
                href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-xl text-[13px] font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                শিট ওপেন করুন <ExternalLink size={16} />
              </a>
            </div>
            {/* Abstract Background Shapes */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl"></div>
          </div>

          <div className="card-premium p-6">
            <h3 className="font-tiro font-bold text-[18px] mb-4">অ্যাডমিন নোট</h3>
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl">
                <p className="text-[12px] text-amber-800 font-medium">আগামী মাসের অডিট রিপোর্ট প্রস্তুত করতে হবে।</p>
              </div>
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl">
                <p className="text-[12px] text-blue-800 font-medium">নতুন ৫ জন সদস্যের তথ্য ভেরিফাই করা প্রয়োজন।</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
