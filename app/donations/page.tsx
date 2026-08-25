"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Search, Calendar, Download, 
  Trash2, Edit2, Wallet, User,
  Filter, MoreHorizontal, X, Save,
  AlertCircle, CheckCircle2
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";

export default function DonationsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  
  const [donations, setDonations] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    member_id: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    donation_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    method: "Cash",
    receipt_no: `R-${Date.now().toString().slice(-6)}`
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: donationsData } = await supabase()
        .from("donations")
        .select("*, members(name, phone)")
        .order("date", { ascending: false });
      
      const { data: membersData } = await supabase()
        .from("members")
        .select("id, name, phone")
        .eq("status", "active")
        .order("name");

      setDonations(donationsData || []);
      setMembers(membersData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (donation: any = null) => {
    if (donation) {
      setEditingDonation(donation);
      setFormData({
        member_id: donation.member_id,
        amount: donation.amount.toString(),
        date: donation.date,
        donation_month: donation.donation_month || "",
        method: donation.method || "Cash",
        receipt_no: donation.receipt_no
      });
    } else {
      setEditingDonation(null);
      setFormData({
        member_id: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        donation_month: new Date().toISOString().slice(0, 7),
        method: "Cash",
        receipt_no: `R-${Date.now().toString().slice(-6)}`
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_id || !formData.amount || !formData.date) {
      alert("সবগুলো প্রয়োজনীয় ঘর পূরণ করুন।");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        created_by: user?.id
      };

      if (editingDonation) {
        const { error } = await supabase()
          .from("donations")
          .update(payload)
          .eq("id", editingDonation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase()
          .from("donations")
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error saving donation:", err);
      alert("সেভ করতে সমস্যা হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই অনুদানটি ডিলিট করতে চান?")) return;
    try {
      const { error } = await supabase().from("donations").delete().eq("id", id);
      if (error) throw error;
      setDonations(donations.filter(d => d.id !== id));
    } catch (err) {
      console.error("Error deleting donation:", err);
      alert("ডিলিট করতে সমস্যা হয়েছে।");
    }
  };

  const filteredDonations = donations.filter(d => 
    d.members?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.receipt_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">অনুদান ও জমা</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের সকল জমার হিসাব</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
          >
            <Plus size={20} />
            <span>নতুন জমা</span>
          </button>
        )}
      </div>

      <div className="card-premium overflow-hidden border border-emerald-50 shadow-sm">
        <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="সদস্য বা রসিদ নং খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all" 
            />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredDonations.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <Wallet size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold font-tiro text-sm">কোনো অনুদানের তথ্য পাওয়া যায়নি।</p>
            </div>
          ) : (
            filteredDonations.map((d) => (
              <div key={d.id} className="p-6 hover:bg-emerald-50/30 transition-all group relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-100">
                      {d.members?.name?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-gray-900">{d.members?.name || 'অজ্ঞাত'}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" />
                          <p className="text-[11px] text-gray-500 font-medium">{d.date}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                          <p className="text-[11px] text-gray-500 font-bold tracking-tighter uppercase">{d.receipt_no}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8">
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600 font-tiro">৳{Number(d.amount).toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{d.donation_month || 'সাধারণ'}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => window.open(`/api/receipts/${d.id}`, "_blank")}
                        className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                        title="রসিদ ডাউনলোড"
                      >
                        <Download size={18} />
                      </button>
                      
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleOpenModal(d)}
                            className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
                            title="এডিট"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(d.id)}
                            className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-red-600 hover:bg-red-50 transition-all active:scale-90"
                            title="ডিলিট"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-emerald-600 text-white">
              <div>
                <h2 className="text-xl font-bold font-tiro">{editingDonation ? 'অনুদান এডিট করুন' : 'নতুন অনুদান যোগ করুন'}</h2>
                <p className="text-emerald-100 text-xs mt-1">সঠিক তথ্য প্রদান করে সেভ করুন</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">সদস্য নির্বাচন করুন *</label>
                <select 
                  value={formData.member_id}
                  onChange={(e) => setFormData({...formData, member_id: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                >
                  <option value="">সদস্য সিলেক্ট করুন</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">টাকার পরিমাণ *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                    <input 
                      type="number"
                      inputMode="numeric"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">তারিখ *</label>
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">মাসের নাম</label>
                  <input 
                    type="month"
                    value={formData.donation_month}
                    onChange={(e) => setFormData({...formData, donation_month: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">পেমেন্ট মেথড</label>
                  <select 
                    value={formData.method}
                    onChange={(e) => setFormData({...formData, method: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bkash">Bkash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">রসিদ নম্বর</label>
                <input 
                  type="text"
                  value={formData.receipt_no}
                  onChange={(e) => setFormData({...formData, receipt_no: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="R-XXXXXX"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save size={20} />
                      <span>সেভ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
