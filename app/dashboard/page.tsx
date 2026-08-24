"use client";

import { useEffect, useState } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { 
  Users, HandCoins, ReceiptText, TrendingUp, AlertCircle, 
  Clock, ShieldAlert, CheckCircle2, ChevronRight 
} from "lucide-react";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

export default function DashboardPage() {
  const { user, role, isApproved, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isApproved) return;
    
    const fetchStats = async () => {
      setLoading(true);
      const { data: members } = await supabase().from("members").select("id", { count: "exact" });
      const { data: donations } = await supabase().from("donations").select("amount");
      const { data: expenses } = await supabase().from("expenses").select("amount");

      const totalDonations = (donations || []).reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalExpenses = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

      setStats({
        membersCount: members?.length || 0,
        totalDonations,
        totalExpenses,
        balance: totalDonations - totalExpenses
      });
      setLoading(false);
    };

    fetchStats();
  }, [user, isApproved]);

  if (authLoading) return <div className="p-10 text-center">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF8F1] p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-sm border border-[#E4DCC8] text-center">
          <ShieldAlert size={48} className="mx-auto mb-4 text-[#A63D40]" />
          <h1 className="text-xl font-bold mb-2" style={{ color: C.ink }}>লগইন প্রয়োজন</h1>
          <p className="text-sm text-gray-600 mb-6">অ্যাপটি ব্যবহার করতে অনুগ্রহ করে লগইন করুন।</p>
          <a href="/login" className="block w-full py-3 bg-[#1B4332] text-white font-bold rounded-sm">লগইন পেজে যান</a>
        </div>
      </div>
    );
  }

  if (!isApproved && role !== 'admin') {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-sm border border-[#E4DCC8] text-center">
          <Clock size={48} className="mx-auto mb-4 text-[#C9972D]" />
          <h1 className="text-xl font-bold mb-2" style={{ color: C.ink, fontFamily: "'Tiro Bangla', serif" }}>অনুমোদনের অপেক্ষায়</h1>
          <p className="text-[14px] text-gray-600 leading-relaxed">
            আপনার অ্যাকাউন্টটি বর্তমানে **পেন্ডিং** অবস্থায় আছে। অ্যাডমিন আপনার অ্যাকাউন্টটি অনুমোদন (Approve) করলেই আপনি ফাউন্ডেশনের হিসাব দেখতে পারবেন। অনুগ্রহ করে অপেক্ষা করুন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।
          </p>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-[12px] text-gray-400">আপনার ইমেইল: {user.email}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-[22px] font-bold mb-1" style={{ color: C.ink, fontFamily: "'Tiro Bangla', serif" }}>এক নজরে ফাউন্ডেশন</h1>
        <p className="text-[13px]" style={{ color: C.sub }}>আজকের সর্বশেষ আপডেট ও সারসংক্ষেপ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="মোট সদস্য" value={stats?.membersCount || 0} color="#1B4332" />
        <StatCard icon={HandCoins} label="মোট সংগ্রহ" value={`৳${stats?.totalDonations.toLocaleString() || 0}`} color="#1B4332" />
        <StatCard icon={ReceiptText} label="মোট খরচ" value={`৳${stats?.totalExpenses.toLocaleString() || 0}`} color="#A63D40" />
        <StatCard icon={TrendingUp} label="বর্তমান তহবিল" value={`৳${stats?.balance.toLocaleString() || 0}`} color="#C9972D" />
      </div>

      {/* Quick Actions or Charts could go here */}
      <div className="bg-white p-6 rounded-sm border border-[#E4DCC8]">
        <h2 className="text-[16px] font-bold mb-4 flex items-center gap-2" style={{ color: C.ink }}>
          <CheckCircle2 size={18} /> স্বাগতম, {user.email?.split('@')[0]}
        </h2>
        <p className="text-[13px] text-gray-600 leading-relaxed mb-6">
          দৌলখাঁড় ফাউন্ডেশন ফান্ড ম্যানেজমেন্ট সিস্টেমে আপনাকে স্বাগতম। এখান থেকে আপনি সদস্য তালিকা, চাঁদা সংগ্রহ এবং ফাউন্ডেশনের যাবতীয় খরচ পর্যবেক্ষণ করতে পারবেন।
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickLink href="/members" label="সদস্য তালিকা দেখুন" />
          <QuickLink href="/donations" label="চাঁদা প্রদান করুন" />
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white p-5 rounded-sm border border-[#E4DCC8] flex items-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: color + '1A', color: color }}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.label }}>{label}</p>
        <p className="text-[18px] font-bold" style={{ color: C.ink }}>{value}</p>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: any) {
  return (
    <a href={href} className="flex items-center justify-between px-4 py-3 rounded-sm border border-[#E4DCC8] hover:bg-[#FBF8F1] transition group">
      <span className="text-[13px] font-medium" style={{ color: C.ink }}>{label}</span>
      <ChevronRight size={14} className="text-gray-400 group-hover:text-[#1B4332] transition" />
    </a>
  );
}
