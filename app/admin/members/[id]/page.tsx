"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
omponents/layout";/d
import { 
  User, Phone, MapPin, Shield, 
  ArrowLeft, Download, Calendar, 
  CreditCard, TrendingUp, CheckCircle
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function MemberDetail() {
  const params = useParams();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;
      const { data: m } = await supabase().from("members").select("*").eq("id", params.id).single();
      const { data: d } = await supabase().from("donations").select("*").eq("member_id", params.id).order("date", { ascending: false });
      setMember(m);
      setDonations(d || []);
      setLoading(false);
    };
    fetchData();
  }, [params.id]);

  if (loading) return (
    
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    
  );

  if (!member) return সদস্য পাওয়া যায়নি;

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
  const monthsPaid = donations.length;

  return (
    
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-emerald-700 font-bold text-[14px] mb-8 group transition-all"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> ফিরে যান
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="card-premium p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
            <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-emerald-600 shadow-inner">
              <User size={48} />
            </div>
            <h2 className="text-[24px] font-bold font-tiro text-gray-900 mb-2">{member.name}</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold uppercase tracking-wider mb-8">
              <CheckCircle size={12} /> {member.status === 'active' ? 'সক্রিয় সদস্য' : 'নিষ্ক্রিয় সদস্য'}
            </div>

            <div className="space-y-4 text-left pt-8 border-t border-gray-100">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 shadow-sm">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">ফোন নম্বর</p>
                  <p className="text-[15px] font-bold text-gray-800">{member.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 shadow-sm">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">ঠিকানা</p>
                  <p className="text-[15px] font-bold text-gray-800">{member.address || 'ঠিকানা নেই'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 shadow-sm">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">অ্যাকাউন্ট স্ট্যাটাস</p>
                  <p className="text-[15px] font-bold text-emerald-600">{member.user_id ? 'লিঙ্ক করা আছে' : 'লিঙ্ক নেই'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-premium p-8">
            <h3 className="text-[14px] font-bold mb-6 uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <TrendingUp size={16} /> পরিসংখ্যান
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl">
                <span className="text-[14px] font-medium text-emerald-900/60">মোট দান</span>
                <span className="text-[20px] font-bold text-emerald-700">৳{totalDonated}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <span className="text-[11px] font-bold text-gray-400 uppercase block mb-1">মাসিক প্রতিশ্রুতি</span>
                  <span className="text-[16px] font-bold text-gray-800">৳{member.pledge_amount}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <span className="text-[11px] font-bold text-gray-400 uppercase block mb-1">পরিশোধিত মাস</span>
                  <span className="text-[16px] font-bold text-gray-800">{monthsPaid} টি</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Donation History */}
        <div className="lg:col-span-2">
          <div className="card-premium overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-[18px] font-bold font-tiro text-gray-900 flex items-center gap-2">
                <CreditCard size={20} className="text-emerald-600" /> ডোনেশন ইতিহাস
              </h3>
              <div className="text-[12px] font-bold text-gray-400 bg-white px-3 py-1 rounded-lg border border-gray-100">
                সর্বমোট {donations.length} টি রেকর্ড
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/30 text-[11px] uppercase text-gray-400 font-bold tracking-wider border-b border-gray-50">
                  <tr>
                    <th className="px-6 py-5">তারিখ</th>
                    <th className="px-6 py-5">মাস</th>
                    <th className="px-6 py-5">পরিমাণ</th>
                    <th className="px-6 py-5">পদ্ধতি</th>
                    <th className="px-6 py-5 text-right">রসিদ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {donations.map((d) => (
                    <tr key={d.id} className="group hover:bg-gray-50/50 transition-all">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-[14px] font-medium text-gray-600">
                          <Calendar size={14} className="text-gray-300" />
                          {new Date(d.date).toLocaleDateString('bn-BD')}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-bold text-gray-800">{d.month}</td>
                      <td className="px-6 py-5">
                        <span className="text-[15px] font-bold text-emerald-600">৳{d.amount}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[11px] font-bold uppercase">{d.method}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <a 
                          href={`/api/receipts/${d.id}`} 
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[12px] font-bold hover:bg-emerald-100 transition-all"
                        >
                          <Download size={14} /> JPG
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {donations.length === 0 && (
              <div className="p-20 text-center text-gray-400">কোনো ডোনেশন রেকর্ড পাওয়া যায়নি</div>
            )}
          </div>
        </div>
      </div>
    
  );
}
