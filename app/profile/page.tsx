'use client';

import React, { useEffect, useState } from 'react';
import { User, CreditCard, History, Settings, LogOut, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [member, setMember] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch member data
      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (memberData) {
        setMember(memberData);
        
        // Fetch donations
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

  const totalDonated = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const lastPayment = donations[0]?.date || '—';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex flex-col md:flex-row items-center gap-6 border border-gray-100">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-green-700" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
            <p className="text-gray-500">ফোন: {member.phone} | স্ট্যাটাস: {member.status}</p>
            <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${member.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                {member.status === 'active' ? 'সক্রিয় সদস্য' : 'নিষ্ক্রিয়'}
              </span>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">মাসিক চাঁদা: ৳{member.monthly_pledge}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={20} /> লগআউট
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1 space-y-2">
            {[
              { icon: <User size={20} />, label: "প্রোফাইল তথ্য", active: true },
              { icon: <History size={20} />, label: "দানের ইতিহাস", active: false },
              { icon: <CreditCard size={20} />, label: "চাঁদা পরিশোধ", active: false },
              { icon: <Settings size={20} />, label: "সেটিংস", active: false },
            ].map((item, i) => (
              <button
                key={i}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  item.active ? 'bg-green-700 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-600 border border-gray-100">
                <p className="text-sm text-gray-500">মোট দান</p>
                <p className="text-xl font-bold text-gray-900">৳{totalDonated}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-600 border border-gray-100">
                <p className="text-sm text-gray-500">শেষ পরিশোধ</p>
                <p className="text-xl font-bold text-gray-900">{lastPayment}</p>
              </div>
            </div>

            {/* Recent History */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">সাম্প্রতিক দানের ইতিহাস</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {donations.length > 0 ? donations.map((d, i) => (
                  <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{d.donation_month || 'সাধারণ দান'}</p>
                      <p className="text-xs text-gray-500">রসিদ: {d.receipt_no || 'N/A'} | তারিখ: {d.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">৳{d.amount}</p>
                      <a 
                        href={`/api/receipts/${d.id}`} 
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded mt-1 transition-colors"
                      >
                        <Download size={10} /> ছবি (JPG)
                      </a>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-gray-500">কোনো দানের ইতিহাস পাওয়া যায়নি।</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
