'use client';

import React, { useEffect, useState } from 'react';
import { User, TrendingUp, Phone, MapPin, ShieldCheck, History, Calendar, Download, LogOut, Lock, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout';

export default function ProfilePage() {
  const [member, setMember] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  
  // Password Change State
  const [showPassModal, setShowPassModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState({ text: "", type: "" });

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (memberData) {
          setMember(memberData);
          const { data: donationData } = await supabase
            .from('donations')
            .select('*')
            .eq('member_id', memberData.id)
            .order('date', { ascending: false });
          setDonations(donationData || []);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage({ text: "", type: "" });

    if (newPassword.length < 6) {
      setPassMessage({ text: "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMessage({ text: "পাসওয়ার্ড দুটি মিলছে না", type: "error" });
      return;
    }

    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setPassMessage({ text: "ত্রুটি: " + error.message, type: "error" });
    } else {
      setPassMessage({ text: "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", type: "success" });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowPassModal(false), 2000);
    }
    setPassLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">লোড হচ্ছে...</p>
        </div>
      </div>
    </AppLayout>
  );

  if (!member) return (
    <AppLayout>
      <div className="flex items-center justify-center py-10 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">সদস্য তথ্য পাওয়া যায়নি</h2>
          <p className="text-gray-500 mb-8">আপনার প্রোফাইল তথ্য খুঁজে পাওয়া যায়নি। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
          <button onClick={handleLogout} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">
            লগআউট করুন
          </button>
        </div>
      </div>
    </AppLayout>
  );

  const filteredDonations = donations.filter(d => d.date && d.date.startsWith(filterYear));
  const totalDonated = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const yearlyDonated = filteredDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const yearlyGoal = (Number(member.monthly_pledge) || 0) * 12;
  const progressPercent = yearlyGoal > 0 ? Math.min(Math.round((yearlyDonated / yearlyGoal) * 100), 100) : 0;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex flex-col md:flex-row items-center gap-6 border border-gray-100">
          <div className="relative">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-green-600 shadow-inner">
              <img src="/assets/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-green-600 text-white p-1 rounded-full border-2 border-white">
              <ShieldCheck size={14} />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Tiro Bangla', serif" }}>{member.name}</h1>
            <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Phone size={14} /> {member.phone}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {member.address || 'ঠিকানা নেই'}</span>
            </div>
            <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {member.status === 'active' ? 'Active Member' : 'Inactive'}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                Pledge: ৳{member.monthly_pledge}/mo
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button 
              onClick={() => setShowPassModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              <Key size={16} /> পাসওয়ার্ড পরিবর্তন
            </button>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">
              <LogOut size={16} /> লগআউট
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <TrendingUp size={16} /> বার্ষিক অগ্রগতি ({filterYear})
              </h3>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-green-600">
                      ৳{yearlyDonated} / ৳{yearlyGoal}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-100">
                  <div style={{ width: `${progressPercent}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-600 transition-all duration-500"></div>
                </div>
              </div>
            </div>

            <div className="bg-green-700 p-6 rounded-2xl shadow-lg text-white">
              <p className="text-green-200 text-xs uppercase font-bold mb-1">সর্বমোট অবদান</p>
              <h2 className="text-3xl font-bold">৳{totalDonated}</h2>
              <div className="mt-4 pt-4 border-t border-green-600/50">
                <p className="text-green-200 text-[11px]">ফাউন্ডেশনের সেবামূলক কাজে আপনার অবদান অপরিসীম। ধন্যবাদ!</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <History size={18} className="text-green-700" /> দানের ইতিহাস
                </h3>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="text-sm border-none bg-gray-50 rounded-lg px-3 py-1.5 focus:ring-0 cursor-pointer">
                    {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 font-bold">
                    <tr>
                      <th className="px-6 py-3">তারিখ</th>
                      <th className="px-6 py-3 text-right">পরিমাণ</th>
                      <th className="px-6 py-3 text-center">রসিদ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredDonations.length > 0 ? filteredDonations.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{d.date}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">৳{d.amount}</td>
                        <td className="px-6 py-4 text-center">
                          <a href={`/api/receipts/${d.id}`} target="_blank" className="inline-flex items-center gap-1 text-[10px] text-green-700 font-bold bg-green-50 px-3 py-1 rounded-full">
                            <Download size={12} /> JPG
                          </a>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400 text-sm">কোনো দানের ইতিহাস পাওয়া যায়নি।</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !passLoading && setShowPassModal(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Lock size={20} className="text-green-700" /> পাসওয়ার্ড পরিবর্তন
              </h2>
              <button onClick={() => setShowPassModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              {passMessage.text && (
                <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${passMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {passMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {passMessage.text}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5 ml-1">নতুন পাসওয়ার্ড</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  required 
                  placeholder="অন্তত ৬ অক্ষরের পাসওয়ার্ড"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-green-600 transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5 ml-1">পাসওয়ার্ড নিশ্চিত করুন</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)}
                  required 
                  placeholder="আবার টাইপ করুন"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-green-600 transition-all text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPassModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">বাতিল</button>
                <button type="submit" disabled={passLoading} className="flex-1 py-3 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition-colors disabled:opacity-50">
                  {passLoading ? "প্রক্রিয়া চলছে..." : "আপডেট করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function X({ size, className }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
