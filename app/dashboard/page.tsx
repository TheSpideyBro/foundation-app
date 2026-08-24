"use client";

import { useState, useEffect } from "react";
import { 
  Users, CreditCard, Wallet, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Calendar,
  ChevronRight, RefreshCw, Activity, Heart,
  Plus
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import Link from "next/link";
import AppLayout from "@/components/layout";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalDonations: 0,
    totalExpenses: 0,
    netBalance: 0,
  });
  const [recentDonations, setRecentDonations] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { count: membersCount } = await supabase()
        .from("members")
        .select("*", { count: "exact", head: true });

      const { data: donations } = await supabase()
        .from("donations")
        .select("amount, date");
      
      const { data: expenses } = await supabase()
        .from("expenses")
        .select("amount, category");

      const totalDonations = donations?.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;

      setStats({
        totalMembers: membersCount || 0,
        totalDonations,
        totalExpenses,
        netBalance: totalDonations - totalExpenses,
      });

      const { data: recent } = await supabase()
        .from("donations")
        .select("*, members(name)")
        .order("date", { ascending: false })
        .limit(5);
      setRecentDonations(recent || []);

      setChartData([
        { name: "জানু", donation: 4000, expense: 2400 },
        { name: "ফেব্রু", donation: 3000, expense: 1398 },
        { name: "মার্চ", donation: 2000, expense: 9800 },
        { name: "এপ্রিল", donation: 2780, expense: 3908 },
        { name: "মে", donation: 1890, expense: 4800 },
        { name: "জুন", donation: 2390, expense: 3800 },
      ]);

      const categories = expenses?.reduce((acc: any, curr) => {
        const cat = curr.category || 'অন্যান্য';
        acc[cat] = (acc[cat] || 0) + (Number(curr.amount) || 0);
        return acc;
      }, {});
      
      const formattedExpenseData = Object.keys(categories || {}).map(cat => ({
        name: cat,
        value: categories[cat]
      }));
      setExpenseData(formattedExpenseData.length > 0 ? formattedExpenseData : [{name: 'তথ্য নেই', value: 1}]);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sheets/sync", { method: "POST" });
      if (res.ok) alert("গুগল শিট সফলভাবে আপডেট হয়েছে!");
      else alert("সিঙ্ক ব্যর্থ হয়েছে!");
    } catch (error) {
      alert("সিঙ্ক ব্যর্থ হয়েছে!");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="touch-spacing animate-slide-up pb-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 font-tiro">আসসালামু আলাইকুম!</h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">আজকের ফাউন্ডেশন কার্যক্রমের চিত্র।</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 sm:flex-none btn-outline px-4 py-2.5 text-sm"
            >
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">শিট সিঙ্ক</span>
              <span className="sm:hidden">সিঙ্ক</span>
            </button>
            <Link href="/donations" className="flex-1 sm:flex-none btn-emerald px-4 py-2.5 text-sm">
              <Plus size={16} />
              <span className="hidden sm:inline">নতুন ডোনেশন</span>
              <span className="sm:hidden">নতুন দান</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid - Optimized for mobile (2 columns) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[
            { label: "মোট সদস্য", value: stats.totalMembers, icon: Users, color: "bg-blue-600", trend: "+12%" },
            { label: "মোট সংগ্রহ", value: stats.totalDonations, icon: CreditCard, color: "bg-emerald-600", trend: "+8%" },
            { label: "মোট ব্যয়", value: stats.totalExpenses, icon: Wallet, color: "bg-rose-600", trend: "-5%" },
            { label: "তহবিল", value: stats.netBalance, icon: TrendingUp, color: "bg-amber-600", trend: "+15%" },
          ].map((stat, i) => (
            <div key={i} className="card-premium p-4 sm:p-8 group">
              <div className="flex items-center justify-between mb-3 sm:mb-6">
                <div className={`w-10 h-10 sm:w-14 sm:h-14 ${stat.color} rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current/20`}>
                  <stat.icon size={20} className="sm:hidden" />
                  <stat.icon size={28} className="hidden sm:block" />
                </div>
                <div className={`flex items-center gap-0.5 text-[10px] sm:text-[12px] font-bold ${stat.trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stat.trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.trend}
                </div>
              </div>
              <h3 className="text-gray-400 text-[9px] sm:text-[11px] font-bold uppercase tracking-widest mb-0.5 sm:mb-1">{stat.label}</h3>
              <p className="text-base sm:text-3xl font-bold text-gray-900 font-tiro truncate">৳{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Charts Section - Stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2 card-premium p-4 sm:p-8">
            <div className="mb-4 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 font-tiro">আর্থিক প্রবৃদ্ধি</h3>
              <p className="text-[10px] sm:text-sm text-gray-400 font-medium">বিগত ৬ মাসের দান ও ব্যয়</p>
            </div>
            <div className="h-[200px] sm:h-[350px] w-full -ml-4 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorDonation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 600}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 600}}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="donation" 
                    stroke="#059669" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorDonation)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-premium p-4 sm:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 font-tiro mb-1 sm:mb-2">ব্যয়ের খাত</h3>
            <p className="text-[10px] sm:text-sm text-gray-400 font-medium mb-4 sm:mb-8">মোট ব্যয়ের বিভাজন</p>
            <div className="h-[180px] sm:h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#059669', '#10B981', '#34D399', '#6EE7B7'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm sm:text-2xl font-bold text-gray-900 font-tiro">৳{stats.totalExpenses.toLocaleString()}</span>
                <span className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest">ব্যয়</span>
              </div>
            </div>
            <div className="mt-4 sm:mt-8 space-y-2">
              {expenseData.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${['bg-emerald-600', 'bg-emerald-500', 'bg-emerald-400', 'bg-emerald-300'][i % 4]}`}></div>
                    <span className="text-[10px] sm:text-sm font-bold text-gray-600 truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <span className="text-[10px] sm:text-sm font-bold text-gray-900">৳{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Donations - Optimized List for Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2 card-premium p-4 sm:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 font-tiro">সাম্প্রতিক দান</h3>
              <Link href="/donations" className="text-emerald-600 text-xs sm:text-sm font-bold flex items-center gap-1 hover:underline">
                সব দেখুন <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {recentDonations.map((donation, i) => (
                <div key={i} className="flex items-center justify-between p-3 sm:p-5 rounded-xl sm:rounded-[1.5rem] hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm sm:text-lg">
                      {donation.members?.name?.[0] || "স"}
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-bold text-gray-900 truncate max-w-[100px] sm:max-w-none">{donation.members?.name || "অজ্ঞাত সদস্য"}</p>
                      <div className="flex items-center gap-1 text-[9px] sm:text-xs text-gray-400 font-medium">
                        <Calendar size={10} />
                        {donation.date ? new Date(donation.date).toLocaleDateString('bn-BD') : 'তারিখ নেই'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm sm:text-lg font-bold text-emerald-600">৳{donation.amount.toLocaleString()}</p>
                    <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest">{donation.method || "ক্যাশ"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-premium p-6 sm:p-8 bg-[#064E3B] text-white border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="relative z-10">
              <h3 className="text-lg sm:text-xl font-bold font-tiro mb-6 sm:mb-8">ফাউন্ডেশন স্ট্যাটাস</h3>
              <div className="space-y-6 sm:space-y-8">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                    <Activity size={20} className="sm:hidden" />
                    <Activity size={24} className="hidden sm:block" />
                  </div>
                  <div>
                    <p className="text-white/50 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5 sm:mb-1">অ্যাক্টিভিটি স্কোর</p>
                    <p className="text-xl sm:text-3xl font-bold font-tiro">৯৪%</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                    <Users size={20} className="sm:hidden" />
                    <Users size={24} className="hidden sm:block" />
                  </div>
                  <div>
                    <p className="text-white/50 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5 sm:mb-1">সক্রিয় সদস্য</p>
                    <p className="text-xl sm:text-3xl font-bold font-tiro">{stats.totalMembers}</p>
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
      </div>
    </AppLayout>
  );
}
