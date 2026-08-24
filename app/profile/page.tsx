"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { 
  User, Phone, MapPin, Award, 
  Calendar, Download, ShieldCheck, 
  Key, Save, X, ChevronRight, Heart,
  Activity
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
      try {
        const { data: m } = await supabase().from("members").select("*").eq("id", memberId).single();
        const { data: d } = await supabase().from("donations").select("*").eq("member_id", memberId).order("date", { ascending: false });
        setMember(m);
        setDonations(d || []);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
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

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </AppLayout>
  );

  if (!member) return (
    <AppLayout>
      <div className="max-w-md mx-auto mt-10 sm:mt-20 text-center px-4 animate-slide-up">
        <div className="card-premium p-8 sm:p-12">
          <div className="w-20 h-20 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-gray-200 mx-auto mb-6">
            <User size={40} />
          </div>
          <h2 className="text-xl font-bold font-tiro text-gray-900 mb-3">সদস্য তথ্য পাওয়া যায়নি</h2>
          <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">আপনার অ্যাকাউন্টের সাথে কোনো মেম্বার প্রোফাইল লিঙ্ক করা নেই।</p>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">আপনার আইডি</p>
            <p className="text-sm font-bold text-gray-700">{phone || user?.email}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );

  const totalDonated = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const monthlyPledge = Number(member.monthly_pledge) || 0;
  const yearlyTarget = monthlyPledge * 12;
  const progress = yearlyTarget > 0 ? Math.min((totalDonated / yearlyTarget) * 100, 100) : 0;

  return (
    <AppLayout>
      <div className="touch-spacing pb-20 animate-slide-up">
        {/* Hero Section - Mobile Responsive */}
        <div className="relative mb-24 sm:mb-32">
          <div className="h-40 sm:h-64 bg-[#064E3B] rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
          </div>
          
          <div className="absolute -bottom-16 left-0 right-0 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8 px-4 sm:px-10">
            <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-[2rem] bg-white p-2 sm:p-3 shadow-2xl relative z-10 self-center sm:self-auto">
              <div className="w-full h-full rounded-[1.5rem] sm:rounded-[2rem] bg-emerald-600 flex items-center justify-center text-white text-4xl sm:text-[56px] font-bold shadow-inner">
                {member.name[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-white flex items-center justify-center text-white shadow-lg">
                <Award size={16} className="sm:hidden" />
                <Award size={20} className="hidden sm:block" />
              </div>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <span className="badge-emerald px-3 py-1 text-[10px]">
                  {role?.toUpperCase()}
                </span>
                {member.status === 'active' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-full border border-blue-100">
                    <ShieldCheck size={12} /> ভেরিফাইড
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-5xl font-bold font-tiro text-gray-900 leading-tight">{member.name}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-xs text-gray-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <Phone size={14} className="text-emerald-600" /> {member.phone}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-600" /> {member.address || 'ঠিকানা নেই'}
                </div>
              </div>
            </div>

            <div className="sm:mb-6 self-center sm:self-auto">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="btn-outline px-5 py-2.5 text-xs whitespace-nowrap"
              >
                <Key size={16} /> পাসওয়ার্ড পরিবর্তন
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
          {/* Contribution Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card-premium p-6 sm:p-8 bg-white relative overflow-hidden">
              <h3 className="text-lg font-bold font-tiro mb-6 flex items-center gap-2">
                <Activity size={20} className="text-emerald-600" /> অবদান অগ্রগতি
              </h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-2">
                    <span className="text-gray-400 uppercase tracking-widest">বার্ষিক লক্ষ্য</span>
                    <span className="text-gray-900">৳{yearlyTarget.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div 
                      className="h-full bg-emerald-600 rounded-full transition-all duration-1000 shadow-lg shadow-emerald-500/30"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">৳{totalDonated.toLocaleString()} জমা</span>
                    <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">{progress.toFixed(0)}% সম্পন্ন</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                  <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-50">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">মোট অনুদান</p>
                    <p className="text-lg font-bold text-emerald-600 font-tiro">৳{totalDonated.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">বাকি</p>
                    <p className="text-lg font-bold text-gray-400 font-tiro">৳{Math.max(0, yearlyTarget - totalDonated).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700">
                  <Heart size={18} className="shrink-0" />
                  <p className="text-[10px] font-bold leading-relaxed">আপনার অবদানের জন্য ফাউন্ডেশন কৃতজ্ঞ।</p>
                </div>
              </div>
            </div>

            <div className="card-premium p-6 sm:p-8">
              <h3 className="text-lg font-bold font-tiro mb-6">সদস্য তথ্য</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-emerald-600 shadow-sm">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">সদস্যপদ শুরু</p>
                    <p className="text-xs font-bold text-gray-900">{member.created_at ? new Date(member.created_at).toLocaleDateString('bn-BD') : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Donation History */}
          <div className="lg:col-span-2">
            <div className="card-premium overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold font-tiro text-gray-900">দানের ইতিহাস</h3>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">সর্বশেষ অনুদানসমূহ</p>
                </div>
                <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                  মোট {donations.length} টি
                </div>
              </div>
              
              <div className="divide-y divide-gray-50">
                {donations.length === 0 ? (
                  <div className="p-20 text-center text-gray-400">
                    <p className="font-bold font-tiro text-sm">কোনো অনুদান পাওয়া যায়নি।</p>
                  </div>
                ) : (
                  donations.map((d, i) => (
                    <div key={i} className="p-5 sm:p-8 flex items-center justify-between hover:bg-emerald-50/20 transition-all group">
                      <div className="flex items-center gap-4 sm:gap-5">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <Calendar size={20} className="sm:hidden" />
                          <Calendar size={24} className="hidden sm:block" />
                        </div>
                        <div>
                          <p className="text-sm sm:text-[17px] font-bold text-gray-900 font-tiro">
                            {d.date ? new Date(d.date).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' }) : 'N/A'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-lg">{d.method || 'Cash'}</span>
                            <span className="text-[9px] sm:text-[11px] text-emerald-600 font-bold">{d.donation_month || 'সাধারণ'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 sm:gap-8">
                        <div className="text-right">
                          <p className="text-base sm:text-2xl font-bold text-emerald-600 font-tiro">৳{Number(d.amount).toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => window.open(`/api/receipts/${d.id}`, "_blank")}
                          className="p-2.5 sm:p-4 text-gray-400 bg-white border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm"
                        >
                          <Download size={16} className="sm:hidden" />
                          <Download size={20} className="hidden sm:block" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal - Mobile Optimized */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-emerald-950/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 bg-[#064E3B] text-white flex items-center justify-between">
              <h2 className="text-xl font-bold font-tiro">পাসওয়ার্ড পরিবর্তন</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">নতুন পাসওয়ার্ড</label>
                <input 
                  type="password" 
                  required 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-base focus:bg-white focus:border-emerald-500/30 transition-all" 
                  placeholder="কমপক্ষে ৬ অক্ষর" 
                />
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-700 text-white rounded-2xl text-base font-bold hover:bg-emerald-800 transition-all shadow-xl shadow-emerald-900/20 active:scale-95">সংরক্ষণ করুন</button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
