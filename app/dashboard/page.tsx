"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { 
  Users, TrendingUp, CreditCard, Wallet, 
  ArrowUpRight, ArrowDownRight, Activity, 
  ChevronRight, ExternalLink, User, Calendar
} from "lucide-react";
import Link from "next/link";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, 
  Cell, PieChart, Pie 
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalDonations: 0,
    monthlyDonations: 0,
    totalExpenses: 0,
    recentDonations: [] as any[],
    chartData: [] as any[],
    expenseData: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: members } = await supabase().from("members").select("id");
      const { data: donations } = await supabase().from("donations").select("*, member:members(name)");
      const { data: expenses } = await supabase().from("expenses").select("*");

      const totalDonations = donations?.reduce((sum, d) => sum + d.amount, 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

      // Calculate monthly donations (current month)
      const now = new Date();
      const currentMonth = now.toLocaleString('default', { month: 'long' });
      const currentYear = now.getFullYear();
      const monthlyDonations = donations?.filter(d => d.month.includes(currentMonth) && d.date.includes(currentYear.toString()))
        .reduce((sum, d) => sum + d.amount, 0) || 0;

      // Prepare chart data (last 6 months)
      const months = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
      const chartData = months.slice(now.getMonth() - 5, now.getMonth() + 1).map(m => {
        const amt = donations?.filter(d => d.month.includes(m)).reduce((sum, d) => sum + d.amount, 0) || 0;
        const exp = expenses?.filter(e => {
          const d = new Date(e.date);
          return months[d.getMonth()] === m;
        }).reduce((sum, e) => sum + e.amount, 0) || 0;
        return { name: m, দান: amt, খরচ: exp };
      });

      // Prepare expense breakdown
      const expenseCats = ["অফিস", "যাতায়াত", "সাহায্য", "অন্যান্য"];
      const expenseData = expenseCats.map(cat => ({
        name: cat,
        value: expenses?.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0) || 0
      })).filter(d => d.value > 0);

      setStats({
        totalMembers: members?.length || 0,
        totalDonations,
        monthlyDonations,
        totalExpenses,
        recentDonations: donations?.slice(0, 5) || [],
        chartData,
        expenseData
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const COLORS = ['#059669', '#10B981', '#34D399', '#6EE7B7'];

  if (loading) return (
    <AppLayout>
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    </AppLayout>
  );

  const statCards = [
    { title: "মোট সদস্য", value: stats.totalMembers, sub: "সক্রিয় সদস্য", icon: Users, color: "emerald", trend: "+5%" },
    { title: "মোট তহবিল", value: `৳${stats.totalDonations}`, sub: "সর্বমোট সংগ্রহ", icon: TrendingUp, color: "blue", trend: "+12%" },
    { title: "চলতি মাসের দান", value: `৳${stats.monthlyDonations}`, sub: "এই মাসে সংগৃহীত", icon: CreditCard, color: "amber", trend: "+8%" },
    { title: "মোট খরচ", value: `৳${stats.totalExpenses}`, sub: "প্রশাসনিক ও অন্যান্য", icon: Wallet, color: "red", trend: "-2%" },
  ];

  return (
    <AppLayout>
      <div className="mb-10">
        <h2 className="text-[28px] font-bold font-tiro text-gray-900 mb-2">ফাউন্ডেশন ড্যাশবোর্ড</h2>
        <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের বর্তমান অবস্থা এবং আর্থিক পরিসংখ্যানের সারসংক্ষেপ।</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statCards.map((card, i) => (
          <div key={i} className="card-premium p-6 group hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                card.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
              }`}>
                <card.icon size={24} />
              </div>
              <span className={`flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${
                card.trend.startsWith('+') ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
              }`}>
                {card.trend.startsWith('+') ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                {card.trend}
              </span>
            </div>
            <h3 className="text-gray-500 text-[13px] font-bold uppercase tracking-widest mb-1">{card.title}</h3>
            <p className="text-[26px] font-bold text-gray-900 mb-1">{card.value}</p>
            <p className="text-[11px] text-gray-400 font-medium">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Main Chart */}
        <div className="lg:col-span-2">
          <div className="card-premium p-8 h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-tiro font-bold text-[20px] text-gray-900">আর্থিক প্রবাহ</h3>
                <p className="text-[12px] text-gray-400">বিগত ৬ মাসের দান ও খরচের তুলনা</p>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-bold">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> দান</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400"></span> খরচ</div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px'}}
                  />
                  <Area type="monotone" dataKey="দান" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                  <Area type="monotone" dataKey="খরচ" stroke="#F87171" strokeWidth={3} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="lg:col-span-1">
          <div className="card-premium p-8 h-full">
            <h3 className="font-tiro font-bold text-[20px] text-gray-900 mb-2">ব্যয়ের খাত</h3>
            <p className="text-[12px] text-gray-400 mb-8">মোট খরচের বিভাজন</p>
            <div className="h-[200px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {stats.expenseData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></span>
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">৳{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
              <Link href="/donations" className="text-[12px] font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1">
                সব দেখুন <ChevronRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.recentDonations.map((d, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-gray-50/80 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-gray-800">{d.member?.name}</p>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1"><Calendar size={12} /> {new Date(d.date).toLocaleDateString('bn-BD')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-emerald-600">+ ৳{d.amount}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">সফল</p>
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
          <div className="bg-[#0F2922] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl group">
            <div className="relative z-10">
              <h3 className="font-tiro text-[24px] font-bold mb-3">গুগল শিট সিঙ্ক</h3>
              <p className="text-white/50 text-[14px] mb-8 leading-relaxed">সব তথ্য রিয়েল-টাইমে আপনার গুগল স্প্রেডশিটের সাথে অটো-সিঙ্ক হচ্ছে।</p>
              <a 
                href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-2xl text-[14px] font-bold hover:bg-emerald-400 hover:scale-105 transition-all shadow-xl shadow-emerald-500/20"
              >
                শিট ওপেন করুন <ExternalLink size={18} />
              </a>
            </div>
            {/* Abstract Background Shapes */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute -left-10 -top-10 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          </div>
          
          <div className="card-premium p-8">
            <h3 className="font-tiro font-bold text-[18px] mb-6 flex items-center gap-2 text-gray-900">
              <span className="w-2 h-6 bg-emerald-600 rounded-full"></span> অ্যাডমিন নোট
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/50 border-l-4 border-amber-400 rounded-2xl">
                <p className="text-[13px] text-amber-900/70 font-bold">আগামী মাসের অডিট রিপোর্ট প্রস্তুত করতে হবে।</p>
              </div>
              <div className="p-4 bg-blue-50/50 border-l-4 border-blue-400 rounded-2xl">
                <p className="text-[13px] text-blue-900/70 font-bold">নতুন ৫ জন সদস্যের তথ্য ভেরিফাই করা প্রয়োজন।</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
