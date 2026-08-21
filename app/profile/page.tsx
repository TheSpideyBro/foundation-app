'use client';

import React, { useEffect, useState } from 'react';
import { User, CreditCard, History, Settings, LogOut, Download, Calendar, TrendingUp, Phone, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { formatMoney, formatDateBengali, monthLabelBengali } from '@/lib/utils';

export default function ProfilePage() {
  const [member, setMember] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (memberData) {
        setMember(memberData);
        const { data: donationData } = await supabase
          .from('donations')
          .select('*')
          .eq('member_id', memberData.id)
          .order('date', { ascending: false });
        
        setDonations(donationData || []);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="p-8 text-center">লোড হচ্ছে...</div>;
  if (!member) return <div className="p-8 text-center">সদস্য তথ্য পাওয়া যায়নি।</div>;

  const filteredDonations = donations.filter(d => d.date.startsWith(filterYear));
  const totalDonated = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const yearlyDonated = filteredDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
  
  // Progress towards yearly pledge (if monthly_pledge * 12)
  const yearlyGoal = (member.monthly_pledge || 0) * 12;
  const progressPercent = yearlyGoal > 0 ? Math.min(Math.round((yearlyDonated / yearlyGoal) * 100), 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex flex-col md:flex-row items-center gap-6 border border-gray-100">
          <div className="relative">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-green-600">
              <img src="/assets/logo.jpg" alt="Logo" className="w-full h-full object-cover opacity-20 absolute" />
              <User className="w-12 h-12 text-green-700 relative z-10" />
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
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
            <LogOut size={18} /> লগআউট
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Stats & Progress */}
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
              <p className="text-[11px] text-gray-500 italic">আপনার বার্ষিক অঙ্গীকার পূরণের লক্ষ্যমাত্রা।</p>
            </div>

            <div className="bg-green-700 p-6 rounded-2xl shadow-lg text-white">
              <p className="text-green-200 text-xs uppercase font-bold mb-1">সর্বমোট অবদান</p>
              <h2 className="text-3xl font-bold">৳{totalDonated}</h2>
              <div className="mt-4 pt-4 border-t border-green-600/50">
                <p className="text-green-200 text-[11px]">ফাউন্ডেশনের সেবামূলক কাজে আপনার অবদান অপরিসীম। ধন্যবাদ!</p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <History size={18} className="text-green-700" /> দানের ইতিহাস
                </h3>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <select 
                    value={filterYear} 
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="text-sm border-none bg-gray-50 rounded-lg px-3 py-1.5 focus:ring-0 cursor-pointer"
                  >
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
                      <th className="px-6 py-3">মাস</th>
                      <th className="px-6 py-3">মাধ্যম</th>
                      <th className="px-6 py-3 text-right">পরিমাণ</th>
                      <th className="px-6 py-3 text-center">রসিদ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredDonations.length > 0 ? filteredDonations.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{d.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{d.donation_month || '—'}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold uppercase">
                            {d.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">৳{d.amount}</td>
                        <td className="px-6 py-4 text-center">
                          <a 
                            href={`/api/receipts/${d.id}`} 
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[10px] text-green-700 hover:text-green-800 font-bold bg-green-50 px-3 py-1 rounded-full transition-colors"
                          >
                            <Download size={12} /> JPG
                          </a>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                          এই বছরে কোনো দানের ইতিহাস পাওয়া যায়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShieldCheck({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <path d="m9 12 2 2 4-4"></path>
    </svg>
  );
}
