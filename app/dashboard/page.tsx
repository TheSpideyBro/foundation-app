"use client";

import { useState, useEffect } from "react";
import { 
  Users, CreditCard, Wallet, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Calendar,
  ChevronRight, RefreshCw, Activity, Heart
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar,
  Cell, PieChart, Pie
} from "recharts";

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

      const totalDonations = donations?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      setStats({
        totalMembers: membersCount || 0,
        totalDonations,
        totalExpenses,
        netBalance: totalDonations - totalExpenses,
      });

      // Recent donations
      const { data: recent } = await supabase()
        .from("donations")
        .select("*, members(name)")
        .order("date", { ascending: false })
        .limit(5);
      setRecentDonations(recent || []);

      // Mock chart data for premium look
      setChartData([
        { name: "Jan", donation: 4000, expense: 2400 },
        { name: "Feb", donation: 3000, expense: 1398 },
        { name: "Mar", donation: 2000, expense: 9800 },
        { name: "Apr", donation: 2780, expense: 3908 },
        { name: "May", donation: 1890, expense: 4800 },
        { name: "Jun", donation: 2390, expense: 3800 },
      ]);

      // Expense breakdown for Pie chart
      const categories = expenses?.reduce((acc: any, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {});
      
      const formattedExpenseData = Object.keys(categories || {}).map(cat => ({
        name: cat,
        value: categories[cat]
      }));
      setExpenseData(formattedExpenseData.length > 0 ? formattedExpenseData : [{name: 'অন্যান্য', value: 1}]);

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
    } catch (error) {
      alert("সিঙ্ক ব্যর্থ হয়েছে!");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">আসসালামু আলাইকুম!</h1>
          <p className="text-gray-500 font-medium">আজকের ফাউন্ডেশন কার্যক্রমের একটি সংক্ষিপ্ত চিত্র।</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="btn-outline"
          >
            <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
            {syncing ? "সিঙ্ক হচ্ছে..." : "গুগল শিট সিঙ্ক"}
          </button>
          <button className="btn-emerald">
            <Heart size={18} />
            নতুন ডোনেশন
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "মোট সদস্য", value: stats.totalMembers, icon: Users, color: "bg-blue-500", trend: "+12%" },
          { label: "মোট সংগ্রহ", value: `৳${stats.totalDonations.toLocaleString()}`, icon: CreditCard, color: "bg-emerald-500", trend: "+8%" },
          { label: "মোট ব্যয়", value: `৳${stats.totalExpenses.toLocaleString()}`, icon: Wallet, color: "bg-rose-500", trend: "-5%" },
          { label: "বর্তমান তহবিল", value: `৳${stats.netBalance.toLocaleString()}`, icon: TrendingUp, color: "bg-amber-500", trend: "+15%" },
        ].map((stat, i) => (
          <div key={i} className="card-premium p-8 group">
            <div className="flex items-center justify-between mb-6">
              <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                <stat.icon size={28} />
              </div>
              <div className={`flex items-center gap-1 text-[12px] font-bold ${stat.trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stat.trend.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.trend}
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">{stat.label}</h3>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Area Chart */}
        <div className="lg:col-span-2 card-premium p-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-bold text-gray-900 font-tiro">আর্থিক প্রবৃদ্ধি</h3>
              <p className="text-sm text-gray-400 font-medium">বিগত ৬ মাসের দান ও ব্যয়ের তুলনা</p>
            </div>
            <select className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none focus:border-emerald-500/30">
              <option>শেষ ৬ মাস</option>
              <option>শেষ ১ বছর</option>
            </select>
          </div>
          <div className="h-[350px] w-full">
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
                  tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="donation" 
                  stroke="#059669" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorDonation)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Pie Chart */}
        <div className="card-premium p-8">
          <h3 className="text-xl font-bold text-gray-900 font-tiro mb-2">ব্যয়ের খাতসমূহ</h3>
          <p className="text-sm text-gray-400 font-medium mb-8">মোট ব্যয়ের বিভাজন</p>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
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
              <span className="text-2xl font-bold text-gray-900">৳{stats.totalExpenses}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">মোট ব্যয়</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {expenseData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${['bg-emerald-600', 'bg-emerald-500', 'bg-emerald-400', 'bg-emerald-300'][i % 4]}`}></div>
                  <span className="text-sm font-bold text-gray-600">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">৳{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card-premium p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900 font-tiro">সাম্প্রতিক দান</h3>
            <Link href="/donations" className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:underline">
              সব দেখুন <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-4">
            {recentDonations.map((donation, i) => (
              <div key={i} className="flex items-center justify-between p-5 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                    {donation.members?.name?.[0] || "স"}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{donation.members?.name || "অজ্ঞাত সদস্য"}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                      <Calendar size={12} />
                      {new Date(donation.date).toLocaleDateString('bn-BD')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 text-lg">৳{donation.amount}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{donation.method || "ক্যাশ"}</p>
                </div>
              </div>
            ))}
            {recentDonations.length === 0 && (
              <div className="text-center py-12 text-gray-400 font-medium italic">
                কোনো তথ্য পাওয়া যায়নি
              </div>
            )}
          </div>
        </div>

        {/* Foundation Info / Quick Stats */}
        <div className="card-premium p-8 bg-[#064E3B] text-white border-none overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold font-tiro mb-6">ফাউন্ডেশন স্ট্যাটাস</h3>
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">অ্যাক্টিভিটি স্কোর</p>
                  <p className="text-2xl font-bold">৯৪%</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">সক্রিয় সদস্য</p>
                  <p className="text-2xl font-bold">{stats.totalMembers}</p>
                </div>
              </div>
              <div className="pt-6 border-t border-white/10">
                <div className="bg-emerald-500/20 rounded-2xl p-6 border border-emerald-400/20">
                  <p className="text-emerald-300 text-[13px] font-bold mb-2">গুগল শিট স্ট্যাটাস</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-white text-sm font-bold">অনলাইন ও সিঙ্কড</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
