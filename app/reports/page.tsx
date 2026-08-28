"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, PieChart, TrendingUp, Download, 
  Calendar, FileText, ArrowUpRight, ArrowDownRight,
  Filter, Search, ChevronRight, LayoutGrid
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
export default function ReportsPage() {
  const [stats, setStats] = useState<any>({
    totalDonations: 0,
    totalExpenses: 0,
    activeMembers: 0,
    monthlyTrend: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [{ data: donations }, { data: expenses }, { data: members }] = await Promise.all([
        supabase().from("donation_summary").select("total_amount").single(),
        supabase().from("expense_summary").select("total_amount").single(),
        supabase().from("member_summary").select("active_members").single()
      ]);

      const totalD = Number(donations?.total_amount) || 0;
      const totalE = Number(expenses?.total_amount) || 0;

      setStats({
        totalDonations: totalD,
        totalExpenses: totalE,
        activeMembers: Number(members?.active_members) || 0,
        balance: totalD - totalE
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-tiro tracking-tight">আর্থিক প্রতিবেদন</h1>
          <p className="text-gray-500 font-medium mt-1">ফাউন্ডেশনের আয়, ব্যয় এবং আর্থিক প্রবৃদ্ধির বিস্তারিত রিপোর্ট।</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline">
            <Calendar size={18} /> সময়কাল নির্বাচন
          </button>
          <button className="btn-emerald shadow-lg shadow-emerald-600/20">
            <Download size={18} /> পিডিএফ ডাউনলোড
          </button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "মোট অনুদান", value: `৳ ${stats.totalDonations.toLocaleString()}`, icon: <TrendingUp className="text-emerald-600" />, trend: "+১২%", color: "emerald" },
          { label: "মোট ব্যয়", value: `৳ ${stats.totalExpenses.toLocaleString()}`, icon: <ArrowDownRight className="text-rose-600" />, trend: "+৫%", color: "rose" },
          { label: "বর্তমান তহবিল", value: `৳ ${(stats.balance || 0).toLocaleString()}`, icon: <BarChart3 className="text-blue-600" />, trend: "সুস্থ", color: "blue" },
          { label: "সক্রিয় সদস্য", value: String(stats.activeMembers), icon: <Users className="text-amber-600" />, trend: "+২", color: "amber" }
        ].map((item, i) => (
          <div key={i} className="card-premium p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${item.color}-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110`}></div>
            <div className="relative z-10">
              <div className={`w-12 h-12 bg-${item.color}-50 rounded-2xl flex items-center justify-center mb-4`}>
                {item.icon}
              </div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{item.value}</h3>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-${item.color}-100 text-${item.color}-700`}>
                  {item.trend}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">এই মাসে</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Analytics Summary */}
        <div className="md:col-span-2 space-y-8">
          <div className="card-premium p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-gray-900 font-tiro">আয়-ব্যয় বিশ্লেষণ</h3>
              <div className="flex bg-gray-50 p-1 rounded-xl">
                <button className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest bg-white text-emerald-600 rounded-lg shadow-sm">মাসিক</button>
                <button className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">বাৎসরিক</button>
              </div>
            </div>
            
            <div className="h-[300px] flex items-end justify-between gap-4 px-4">
              {[60, 45, 80, 55, 90, 75].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="w-full relative">
                    <div 
                      className="w-full bg-emerald-100 rounded-t-xl transition-all duration-700 group-hover:bg-emerald-200" 
                      style={{ height: `${h}%` }}
                    ></div>
                    <div 
                      className="absolute bottom-0 w-full bg-emerald-600 rounded-t-xl transition-all duration-700 shadow-lg shadow-emerald-600/20" 
                      style={{ height: `${h * 0.7}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">মাস {i+1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-premium p-6">
              <h4 className="text-lg font-bold text-gray-900 font-tiro mb-6">শীর্ষ অনুদানকারী</h4>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                        {i}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">সদস্য {i}</p>
                        <p className="text-[10px] text-gray-400 font-medium tracking-wide">১০টি অনুদান</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">৳ ৫,০০০</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-premium p-6">
              <h4 className="text-lg font-bold text-gray-900 font-tiro mb-6">ব্যয়ের খাতসমূহ</h4>
              <div className="space-y-4">
                {[
                  { label: "অফিস খরচ", val: "৪০%", color: "bg-emerald-500" },
                  { label: "সাহায্য", val: "৩৫%", color: "bg-blue-500" },
                  { label: "অন্যান্য", val: "২৫%", color: "bg-amber-500" }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                      <span className="text-gray-500">{item.label}</span>
                      <span className="text-gray-900">{item.val}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: item.val }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reports Sidebar */}
        <div className="space-y-6">
          <div className="card-premium p-6">
            <h3 className="text-lg font-bold text-gray-900 font-tiro mb-6">সাম্প্রতিক রিপোর্ট</h3>
            <div className="space-y-3">
              {[
                { title: "জুলাই ২০২৬ - মাসিক রিপোর্ট", date: "২ আগস্ট, ২০২৬", type: "PDF" },
                { title: "জুন ২০২৬ - আর্থিক বিবরণী", date: "৫ জুলাই, ২০২৬", type: "XLS" },
                { title: "বাৎসরিক অডিট রিপোর্ট ২০২৫", date: "১৫ জানুয়ারি, ২০২৬", type: "PDF" }
              ].map((report, i) => (
                <div key={i} className="p-4 border border-gray-50 rounded-2xl hover:border-emerald-100 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white border border-gray-100 text-rose-500 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 leading-tight mb-1">{report.title}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{report.date} • {report.type}</p>
                    </div>
                    <Download size={16} className="text-gray-300 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 text-[11px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors">
              সব রিপোর্ট দেখুন
            </button>
          </div>

          <div className="card-premium p-6 bg-emerald-600 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <h4 className="text-lg font-bold font-tiro mb-2">সদস্যদের সক্রিয়তা</h4>
              <p className="text-emerald-100 text-[13px] font-medium leading-relaxed mb-6">
                আপনার ফাউন্ডেশনের ৯৫% সদস্য নিয়মিত চাঁদা প্রদান করছেন।
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-[95%]"></div>
                </div>
                <span className="text-sm font-bold">৯৫%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Users(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
