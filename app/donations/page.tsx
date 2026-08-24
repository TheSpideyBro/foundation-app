"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { logAudit } from "@/lib/audit";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { 
  Plus, Search, Filter, Download, 
  MessageCircle, Info, XCircle, 
  Calendar, CreditCard, User, 
  ChevronRight, ArrowUpRight
} from "lucide-react";

export default function DonationsPage() {
  const { role, memberId } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ 
    member_id: "", 
    amount: 0, 
    date: new Date().toISOString().split('T')[0], 
    method: "Cash", 
    month_count: 1 
  });

  const fetchData = async () => {
    setLoading(true);
    let query = supabase().from("donations").select("*, member:members(name, phone)");
    if (role === 'member' && memberId) {
      query = query.eq("member_id", memberId);
    }
    const { data: donationData } = await query.order("date", { ascending: false });
    const { data: memberData } = await supabase().from("members").select("id, name, phone").eq("status", "active");
    
    setDonations(donationData || []);
    setMembers(memberData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [role, memberId]);

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const rows = [];
    const startDate = new Date(formData.date);
    
    for (let i = 0; i < formData.month_count; i++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(startDate.getMonth() + i);
      rows.push({
        member_id: formData.member_id,
        amount: formData.amount / formData.month_count,
        date: currentDate.toISOString().split('T')[0],
        method: formData.method,
        notes: formData.month_count > 1 ? `মাসিক কিস্তি ${i + 1}/${formData.month_count}` : ""
      });
    }

    const { data, error } = await supabase().from("donations").insert(rows).select();
    if (error) alert(error.message);
    else {
      logAudit("donation.create", "donations", data[0].id, formData);
      setShowAddModal(false);
      fetchData();
    }
  };

  const handleWhatsAppNotify = async (donation: any) => {
    try {
      const res = await fetch('/api/notify/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationId: donation.id })
      });
      const data = await res.json();
      if (data.success) alert("WhatsApp নোটিফিকেশন পাঠানো হয়েছে!");
      else alert("নোটিফিকেশন পাঠানো ব্যর্থ হয়েছে: " + data.error);
    } catch (err) {
      alert("সার্ভার এরর");
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">দান ও চাঁদা</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের সকল জমার হিসাব</p>
        </div>
        {(role === 'admin' || role === 'treasurer') && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#1B4332] text-white rounded-2xl text-[14px] font-bold hover:bg-[#2D6A4F] transition-all shadow-lg shadow-emerald-900/20"
          >
            <Plus size={20} /> নতুন জমা
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="card-premium p-6 bg-emerald-50/50 border-emerald-100">
          <p className="text-[12px] font-bold text-emerald-700 uppercase tracking-wider mb-1">মোট সংগ্রহ</p>
          <p className="text-[24px] font-bold text-emerald-900">৳{donations.reduce((sum, d) => sum + d.amount, 0)}</p>
        </div>
        <div className="card-premium p-6">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">চলতি মাসে</p>
          <p className="text-[24px] font-bold text-gray-800">৳{donations.filter(d => new Date(d.date).getMonth() === new Date().getMonth()).reduce((sum, d) => sum + d.amount, 0)}</p>
        </div>
        <div className="card-premium p-6">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">মোট লেনদেন</p>
          <p className="text-[24px] font-bold text-gray-800">{donations.length} টি</p>
        </div>
      </div>

      {/* Donations Table */}
      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="সদস্যের নাম দিয়ে খুঁজুন..." className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-[14px] outline-none focus:bg-white transition-all" />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-[13px] font-bold hover:bg-gray-100 transition-all">
              <Filter size={16} /> ফিল্টার
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 text-[12px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-5">সদস্য</th>
                <th className="px-6 py-5 text-center">তারিখ</th>
                <th className="px-6 py-5 text-center">পদ্ধতি</th>
                <th className="px-6 py-5 text-center">পরিমাণ</th>
                <th className="px-6 py-5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {donations.map((d) => (
                <tr key={d.id} className="group hover:bg-gray-50/50 transition-all">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-gray-800">{d.member?.name}</p>
                        <p className="text-[11px] text-gray-400">{d.notes || 'সাধারণ চাঁদা'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[13px] font-medium text-gray-600 flex items-center justify-center gap-1">
                      <Calendar size={12} /> {new Date(d.date).toLocaleDateString('bn-BD')}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-bold uppercase tracking-tighter">
                      <CreditCard size={12} className="mr-1.5" /> {d.method}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[16px] font-bold text-emerald-600">৳{d.amount}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a 
                        href={`/api/receipts/${d.id}`} 
                        target="_blank"
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Download Receipt"
                      >
                        <Download size={18} />
                      </a>
                      {(role === 'admin' || role === 'treasurer') && (
                        <button 
                          onClick={() => handleWhatsAppNotify(d)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Send WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {donations.length === 0 && (
          <div className="p-20 text-center text-gray-400">কোনো তথ্য পাওয়া যায়নি</div>
        )}
      </div>

      {/* Add Donation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-[#0F2922] text-white flex items-center justify-between">
              <h2 className="text-[22px] font-bold font-tiro">নতুন জমা এন্ট্রি</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleAddDonation} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">সদস্য সিলেক্ট করুন</label>
                <select required value={formData.member_id} onChange={e => setFormData({...formData, member_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all appearance-none">
                  <option value="">সদস্য নির্বাচন করুন</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">মোট পরিমাণ (৳)</label>
                  <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all" placeholder="৫০০" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">কত মাসের জন্য?</label>
                  <select value={formData.month_count} onChange={e => setFormData({...formData, month_count: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all appearance-none">
                    {[1,2,3,4,5,6,12].map(n => <option key={n} value={n}>{n} মাস</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">তারিখ</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">পদ্ধতি</label>
                  <select value={formData.method} onChange={e => setFormData({...formData, method: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all appearance-none">
                    <option value="Cash">Cash</option>
                    <option value="Bkash">Bkash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-[#1B4332] text-white rounded-2xl text-[16px] font-bold hover:bg-[#2D6A4F] transition-all shadow-xl shadow-emerald-900/20 mt-4">জমা নিশ্চিত করুন</button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
