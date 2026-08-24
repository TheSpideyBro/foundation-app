"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { 
  ArrowLeft, Phone, MapPin, Calendar, DollarSign, 
  TrendingUp, Clock, FileText, Download, CheckCircle, 
  AlertCircle, User, Shield
} from "lucide-react";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

export default function AdminMemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useAuth();
  const [member, setMember] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== 'admin' && role !== 'treasurer') return;
    
    const fetchData = async () => {
      setLoading(true);
      const { data: m } = await supabase().from("members").select("*").eq("id", params.id).single();
      const { data: d } = await supabase().from("donations").select("*").eq("member_id", params.id).order("date", { ascending: false });
      
      setMember(m);
      setDonations(d || []);
      setLoading(false);
    };
    
    fetchData();
  }, [params.id, role]);

  if (role !== 'admin' && role !== 'treasurer') return <AppLayout><div className="p-10 text-center">অনুমতি নেই</div></AppLayout>;
  if (loading) return <AppLayout><div className="p-10 text-center">লোডিং...</div></AppLayout>;
  if (!member) return <AppLayout><div className="p-10 text-center text-red-500">সদস্য পাওয়া যায়নি</div></AppLayout>;

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
  const monthsPaid = new Set(donations.map(d => d.month)).size;

  return (
    <AppLayout>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-ink mb-6 text-[13px] font-medium transition-colors">
        <ArrowLeft size={16} /> ফিরে যান
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-sm border p-6 text-center" style={{ borderColor: C.border }}>
            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center text-ink/20">
              <User size={48} />
            </div>
            <h2 className="text-[20px] font-bold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>{member.name}</h2>
            <p className="text-[12px] text-gray-500 mb-4">{member.status === 'active' ? 'সক্রিয় সদস্য' : 'নিষ্ক্রিয় সদস্য'}</p>
            
            <div className="flex flex-col gap-3 text-left border-t pt-4" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-3 text-[13px]">
                <Phone size={14} className="text-gray-400" />
                <span>{member.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <MapPin size={14} className="text-gray-400" />
                <span>{member.address || 'ঠিকানা নেই'}</span>
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <Shield size={14} className="text-gray-400" />
                <span className="capitalize">{member.user_id ? 'Linked Account' : 'No Linked Account'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-sm border p-6" style={{ borderColor: C.border }}>
            <h3 className="text-[14px] font-bold mb-4 uppercase tracking-wider text-gray-400">পরিসংখ্যান</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-500">মোট দান</span>
                <span className="text-[15px] font-bold text-ink">৳{totalDonated}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-500">মাসিক প্রতিশ্রুতি</span>
                <span className="text-[15px] font-bold">৳{member.pledge_amount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-500">পরিশোধিত মাস</span>
                <span className="text-[15px] font-bold">{monthsPaid} টি</span>
              </div>
            </div>
          </div>
        </div>

        {/* Donation History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-sm border overflow-hidden" style={{ borderColor: C.border }}>
            <div className="p-4 border-b bg-gray-50 font-bold text-[15px]" style={{ fontFamily: "'Tiro Bangla', serif", borderColor: C.border }}>
              ডোনেশন ইতিহাস
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 font-bold border-b">
                <tr>
                  <th className="px-6 py-3">তারিখ</th>
                  <th className="px-6 py-3">মাস</th>
                  <th className="px-6 py-3">পরিমাণ</th>
                  <th className="px-6 py-3">পদ্ধতি</th>
                  <th className="px-6 py-3 text-right">রসিদ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {donations.map((d) => (
                  <tr key={d.id} className="text-[13px] hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">{new Date(d.date).toLocaleDateString('bn-BD')}</td>
                    <td className="px-6 py-4 font-medium">{d.month}</td>
                    <td className="px-6 py-4 font-bold text-ink">৳{d.amount}</td>
                    <td className="px-6 py-4 capitalize">{d.method}</td>
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={`/api/receipts/${d.id}`} 
                        target="_blank"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                      >
                        <Download size={12} /> JPG
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {donations.length === 0 && (
              <div className="p-10 text-center text-gray-400">কোনো ডোনেশন রেকর্ড পাওয়া যায়নি</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
