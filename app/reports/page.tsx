"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { 
  FileText, Download, TrendingUp, 
  TrendingDown, Users, Calendar,
  ArrowUpRight, ArrowDownRight,
  PieChart, BarChart3, Activity
} from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>({
    totalDonations: 0,
    totalExpenses: 0,
    activeMembers: 0,
    monthlyDonations: 0,
    monthlyExpenses: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: donations } = await supabase().from("donations").select("amount, date");
      const { data: expenses } = await supabase().from("expenses").select("amount, date");
      const { count: members } = await supabase().from("members").select("*", { count: 'exact', head: true }).eq("status", "active");
      
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const totalD = donations?.reduce((sum, d) => sum + d.amount, 0) || 0;
      const totalE = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
      
      const monthlyD = donations?.filter(d => {
        const date = new Date(d.date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      }).reduce((sum, d) => sum + d.amount, 0) || 0;

      const monthlyE = expenses?.filter(e => {
        const date = new Date(e.date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      }).reduce((sum, e) => sum + e.amount, 0) || 0;

      setStats({
        totalDonations: totalD,
        totalExpenses: totalE,
        activeMembers: members || 0,
        monthlyDonations: monthlyD,
        monthlyExpenses: monthlyE
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">রিপোর্ট ও পরিসংখ্যান</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের আর্থিক অবস্থার বিস্তারিত চিত্র</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-[14px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
          <Download size={20} /> পিডিএফ ডাউনলোড
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <ArrowUpRight size={12} /> +১২%
            </span>
          </div>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">মোট সংগ্রহ</p>
          <p className="text-[24px] font-bold text-gray-900">৳{stats.totalDonations}</p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown size={24} />
            </div>
            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <ArrowDownRight size={12} /> -৫%
            </span>
          </div>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">মোট ব্যয়</p>
          <p className="text-[24px] font-bold text-gray-900">৳{stats.totalExpenses}</p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">সক্রিয় সদস্য</p>
          <p className="text-[24px] font-bold text-gray-900">{stats.activeMembers} জন</p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity size={24} />
            </div>
          </div>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">নীট ব্যালেন্স</p>
          <p className="text-[24px] font-bold text-emerald-700">৳{stats.totalDonations - stats.totalExpenses}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-premium p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[18px] font-bold font-tiro flex items-center gap-2">
              <BarChart3 size={20} className="text-emerald-600" /> মাসিক আয়-ব্যয় তুলনা
            </h3>
            <select className="bg-gray-50 border-none rounded-xl text-[12px] font-bold px-3 py-2 outline-none">
              <option>২০২৪</option>
              <option>২০২৩</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 px-4">
            {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-emerald-100 rounded-t-xl relative group" style={{ height: `${h}%` }}>
                  <div className="absolute inset-0 bg-emerald-500 rounded-t-xl scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-500"></div>
                </div>
                <span className="text-[10px] font-bold text-gray-400">মাস {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-premium p-8">
          <h3 className="text-[18px] font-bold font-tiro mb-8 flex items-center gap-2">
            <PieChart size={20} className="text-blue-600" /> ব্যয়ের খাতসমূহ
          </h3>
          <div className="space-y-6">
            {[
              { label: 'অফিস ভাড়া', value: 45, color: 'bg-emerald-500' },
              { label: 'যাতায়াত', value: 25, color: 'bg-blue-500' },
              { label: 'অনুদান', value: 20, color: 'bg-amber-500' },
              { label: 'অন্যান্য', value: 10, color: 'bg-gray-400' }
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-[13px] font-bold mb-2">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="text-gray-900">{item.value}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
