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
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </AppLayout>
  );

  if (!member) return (
    <AppLayout>
      <div className="max-w-md mx-auto mt-20 text-center animate-slide-up">
        <div className="card-premium p-12">
          <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200 mx-auto mb-8">
            <User size={48} />
          </div>
          <h2 className="text-2xl font-bold font-tiro text-gray-900 mb-4">সদস্য তথ্য পাওয়া যায়নি</h2>
          <p className="text-gray-500 font-medium leading-relaxed mb-8">আপনার অ্যাকাউন্টের সাথে কোনো মেম্বার প্রোফাইল লিঙ্ক করা নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-widest mb-1">আপনার আইডি</p>
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
      <div className="max-w-6xl mx-auto pb-20 animate-slide-up">
        {/* Hero Section */}
        <div className="relative mb-32">
          <div className="h-64 bg-[#064E3B] rounded-[3rem] shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          </div>
          
          <div className="absolute -bottom-20 left-10 flex flex-col md:flex-row md:items-end gap-8 px-4 w-full">
            <div className="w-40 h-40 rounded-[2.5rem] bg-white p-3 shadow-2xl relative z-10">
              <div className="w-full h-full rounded-[2rem] bg-emerald-600 flex items-center justify-center text-white text-[56px] font-bold shadow-inner">
                {member.name[0]}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-2xl border-4 border-white flex items-center justify-center text-white shadow-lg">
                <Award size={20} />
              </div>
            </div>
            
            <div className="mb-4 flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="badge-emerald px-4 py-1.5 border border-emerald-100 shadow-sm">
                  {role?.toUpperCase()}
                </span>
                {member.status === 'active' && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider rounded-full border border-blue-100 shadow-sm">
                    <ShieldCheck size={14} /> ভেরিফাইড সদস্য
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-tiro text-gray-900 leading-tight">{member.name}</h1>
              <div className="flex flex-wrap items-center gap-6 mt-4 text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-emerald-600" /> {member.phone}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-600" /> {member.address || 'ঠিকানা নেই'}
                </div>
              </div>
            </div>

            <div className="md:mb-6 md:mr-20">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="btn-outline px-6 py-3 text-sm whitespace-nowrap"
              >
                <Key size={18} /> পাসওয়ার্ড পরিবর্তন
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-10">
          {/* Left Side: Contribution Card */}
          <div className="lg:col-span-1 space-y-8">
            <div className="card-premium p-8 bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="text-xl font-bold font-tiro mb-8 flex items-center gap-2 relative z-10">
                <Activity size={20} className="text-emerald-600" /> অবদান অগ্রগতি
              </h3>
              
              <div className="space-y-8 relative z-10">
                <div>
                  <div className="flex justify-between text-[13px] font-bold mb-3">
                    <span className="text-gray-400 uppercase tracking-widest">বার্ষিক লক্ষ্যমাত্রা</span>
                    <span className="text-gray-900">৳{yearlyTarget.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden p-1 shadow-inner">
                    <div 
                      className="h-full bg-emerald-600 rounded-full transition-all duration-1000 shadow-lg shadow-emerald-500/30"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-3">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">৳{totalDonated.toLocaleString()} জমা</span>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{progress.toFixed(0)}% সম্পন্ন</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-50">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">মোট অনুদান</p>
                    <p className="text-2xl font-bold text-emerald-600 font-tiro">৳{totalDonated.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">বাকি পরিমাণ</p>
                    <p className="text-2xl font-bold text-gray-400 font-tiro">৳{Math.max(0, yearlyTarget - totalDonated).toLocaleString()}</p>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700">
                    <Heart size={20} className="shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">আপনার অবদানের জন্য ফাউন্ডেশন কৃতজ্ঞ। আল্লাহ আপনার রিজিকে বরকত দান করুন।</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-premium p-8">
              <h3 className="text-xl font-bold font-tiro mb-8">সদস্য তথ্য</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-emerald-600 shadow-sm">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">সদস্যপদ শুরু</p>
                    <p className="text-sm font-bold text-gray-900">{member.created_at ? new Date(member.created_at).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-emerald-600 shadow-sm">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">যোগাযোগ</p>
                    <p className="text-sm font-bold text-gray-900">{member.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Donation History */}
          <div className="lg:col-span-2">
            <div className="card-premium overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div>
                  <h3 className="text-xl font-bold font-tiro text-gray-900">আমার দানের ইতিহাস</h3>
                  <p className="text-xs text-gray-400 font-medium mt-1">সর্বশেষ অনুদানসমূহ</p>
                </div>
                <div className="px-4 py-2 bg-white border border-gray-200 rounded-2xl text-[11px] font-bold text-gray-500 uppercase tracking-widest shadow-sm">
                  মোট {donations.length} টি
                </div>
              </div>
              
              <div className="divide-y divide-gray-50">
                {donations.length === 0 ? (
                  <div className="p-32 text-center text-gray-400">
                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200 mx-auto mb-6">
                      <Heart size={40} />
                    </div>
                    <p className="font-bold font-tiro">এখনো কোনো অনুদান পাওয়া যায়নি।</p>
                  </div>
                ) : (
                  donations.map((d, i) => (
                    <div key={i} className="p-8 flex items-center justify-between hover:bg-emerald-50/20 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
                          <Calendar size={24} />
                        </div>
                        <div>
                          <p className="text-[17px] font-bold text-gray-900 font-tiro">
                            {d.date ? new Date(d.date).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' }) : 'N/A'}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-lg">{d.method || 'Cash'}</span>
                            <span className="text-[11px] text-emerald-600 font-bold">{d.donation_month || 'সাধারণ চাঁদা'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-600 font-tiro">৳{Number(d.amount).toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-0.5">সফল</p>
                        </div>
                        <button 
                          onClick={() => window.open(`/api/receipts/${d.id}`, "_blank")}
                          className="p-4 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm bg-white border border-gray-100"
                        >
                          <Download size={20} />
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

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-[#064E3B] text-white flex items-center justify-between">
              <h2 className="text-2xl font-bold font-tiro">পাসওয়ার্ড পরিবর্তন</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleChangePassword} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">নতুন পাসওয়ার্ড সেট করুন</label>
                <div className="relative">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="password" 
                    required 
                    minLength={6}
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-transparent rounded-[1.5rem] outline-none text-[16px] font-medium focus:bg-white focus:border-emerald-500/30 transition-all shadow-inner" 
                    placeholder="কমপক্ষে ৬ অক্ষর"
                  />
                </div>
              </div>
              <button type="submit" className="btn-emerald w-full py-5 text-[16px] shadow-2xl shadow-emerald-900/20 mt-4">
                পরিবর্তন নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
