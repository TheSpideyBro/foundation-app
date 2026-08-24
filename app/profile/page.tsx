"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { 
  User, Phone, MapPin, Award, 
  Calendar, Download, ShieldCheck, 
  Key, Save, X, ChevronRight, Heart
} from "lucide-react";

export default function ProfilePage() {
  const { user, memberId, role, phone } = useAuth();
  const [member, setMember] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!memberId) {
        setLoading(false);
        return;
      }
      const { data: m } = await supabase().from("members").select("*").eq("id", memberId).single();
      const { data: d } = await supabase().from("donations").select("*").eq("member_id", memberId).order("date", { ascending: false });
      setMember(m);
      setDonations(d || []);
      setLoading(false);
    };
    fetchProfile();
  }, [memberId]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase().auth.updateUser({ password: newPassword });
    if (error) alert(error.message);
    else {
      alert("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!");
      setShowPasswordModal(false);
      setNewPassword("");
    }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center min-h-[400px] text-gray-400">লোড হচ্ছে...</div></AppLayout>;

  if (!member) return (
    <AppLayout>
      <div className="card-premium p-12 text-center flex flex-col items-center gap-4">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
          <User size={40} />
        </div>
        <div>
          <h2 className="text-[22px] font-bold font-tiro text-gray-800">সদস্য তথ্য পাওয়া যায়নি</h2>
          <p className="text-gray-400 text-[14px] max-w-xs mx-auto">আপনার একাউন্টের সাথে কোনো মেম্বার প্রোফাইল লিঙ্ক করা নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
        </div>
      </div>
    </AppLayout>
  );

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
  const progress = Math.min((totalDonated / (member.pledge_amount * 12)) * 100, 100);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="relative mb-20">
          <div className="h-48 bg-[#0F2922] rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
          </div>
          <div className="absolute -bottom-16 left-8 flex flex-col md:flex-row md:items-end gap-6 px-4">
            <div className="w-32 h-32 rounded-[2rem] bg-white p-2 shadow-2xl">
              <div className="w-full h-full rounded-[1.5rem] bg-emerald-600 flex items-center justify-center text-white text-[40px] font-bold shadow-inner">
                {member.name[0]}
              </div>
            </div>
            <div className="mb-2">
              <h1 className="text-[32px] font-bold font-tiro text-gray-900 leading-tight">{member.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  <Phone size={14} /> {member.phone}
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  <Award size={14} /> {role?.toUpperCase()}
                </span>
                {member.status === 'active' && (
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    <ShieldCheck size={14} /> সক্রিয় সদস্য
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-12 right-8 hidden md:block">
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Key size={16} /> পাসওয়ার্ড পরিবর্তন
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-24">
          {/* Left Column: Stats & Info */}
          <div className="lg:col-span-1 space-y-8">
            <div className="card-premium p-8">
              <h3 className="text-[18px] font-bold font-tiro mb-6 flex items-center gap-2">
                <Activity size={18} className="text-emerald-600" /> অবদান অগ্রগতি
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[13px] font-bold mb-2">
                    <span className="text-gray-500 uppercase tracking-wider">বার্ষিক লক্ষ্যমাত্রা</span>
                    <span className="text-gray-900">৳{member.pledge_amount * 12}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 font-medium uppercase tracking-widest text-right">{progress.toFixed(0)}% সম্পন্ন</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                  <div>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">মোট দান</p>
                    <p className="text-[20px] font-bold text-emerald-600">৳{totalDonated}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">বাকি</p>
                    <p className="text-[20px] font-bold text-gray-400">৳{Math.max(0, (member.pledge_amount * 12) - totalDonated)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-premium p-8">
              <h3 className="text-[18px] font-bold font-tiro mb-6">যোগাযোগের তথ্য</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">ঠিকানা</p>
                    <p className="text-[14px] text-gray-700 font-medium leading-relaxed">{member.address || 'তথ্য নেই'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">সদস্যপদ শুরু</p>
                    <p className="text-[14px] text-gray-700 font-medium">{new Date(member.created_at).toLocaleDateString('bn-BD')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Donation History */}
          <div className="lg:col-span-2">
            <div className="card-premium overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <h3 className="text-[20px] font-bold font-tiro flex items-center gap-2">
                  <Heart size={20} className="text-red-500" /> আমার দানের ইতিহাস
                </h3>
                <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  মোট {donations.length} টি
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {donations.map((d, i) => (
                  <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-800">{new Date(d.date).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })}</p>
                        <p className="text-[12px] text-gray-400">{d.method} • {d.notes || 'সাধারণ চাঁদা'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[18px] font-bold text-emerald-600">৳{d.amount}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">সফল</p>
                      </div>
                      <a 
                        href={`/api/receipts/${d.id}`} 
                        target="_blank"
                        className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                      >
                        <Download size={20} />
                      </a>
                    </div>
                  </div>
                ))}
                {donations.length === 0 && (
                  <div className="p-20 text-center text-gray-400 text-[14px]">এখনো কোনো দান করা হয়নি।</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-[#0F2922] text-white flex items-center justify-between">
              <h2 className="text-[20px] font-bold font-tiro">পাসওয়ার্ড পরিবর্তন</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleChangePassword} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">নতুন পাসওয়ার্ড</label>
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all" 
                  placeholder="কমপক্ষে ৬ অক্ষর"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-[#1B4332] text-white rounded-2xl text-[16px] font-bold hover:bg-[#2D6A4F] transition-all shadow-xl shadow-emerald-900/20 mt-4">পরিবর্তন নিশ্চিত করুন</button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
