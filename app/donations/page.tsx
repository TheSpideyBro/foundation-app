"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Search, Calendar, Download, 
  Trash2, Edit2, Wallet, User,
  Filter, MoreHorizontal, X, Save,
  AlertCircle, CheckCircle2, Eye, Share2
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";

export default function DonationsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  const isStaff = isAdmin || role === 'treasurer';
  
  const [donations, setDonations] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [treasurers, setTreasurers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    member_id: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    donation_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    method: "cash",
    receipt_no: `R-${Date.now().toString().slice(-6)}`,
    collected_by: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const { memberId } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase()
        .from("donations")
        .select("*, members(name, phone)")
        .order("date", { ascending: false });
      
      if (role === 'member') {
        if (memberId) {
          query = query.eq("member_id", memberId);
        } else {
          setDonations([]);
          setLoading(false);
          return;
        }
      }

      const { data: donationsData } = await query;
      
      const { data: membersData } = await supabase()
        .from("members")
        .select("id, name, phone")
        .eq("status", "active")
        .order("name");

      // Fetch treasurers and admins for the collected_by field
      const { data: staffData } = await supabase()
        .from("users")
        .select(`
          id,
          name,
          email,
          phone,
          role,
          members:member_id (
            name
          )
        `)
        .in("role", ["admin", "treasurer"]);

      // Map staff to usable objects for the dropdown
      const treasurersList = staffData?.map((s: any) => ({
        id: s.id,
        name: s.members?.name || s.name || s.email?.split('@')[0] || "Staff",
      })) || [];
      
      // If a staff member has a name but no member_id link, we still show them
      console.log("Treasurers List for UI:", treasurersList);
      
      console.log("Treasurers List:", treasurersList);

      setDonations(donationsData || []);
      setMembers(membersData || []);
      setTreasurers(treasurersList);
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
        method: donation.method || "cash",
        receipt_no: donation.receipt_no,
        collected_by: donation.collected_by || ""
      });
    } else {
      setEditingDonation(null);
      setFormData({
        member_id: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        donation_month: new Date().toISOString().slice(0, 7),
        method: "cash",
        receipt_no: `R-${Date.now().toString().slice(-6)}`,
        collected_by: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_id || !formData.amount || !formData.date || !formData.collected_by) {
      alert("সবগুলো প্রয়োজনীয় ঘর পূরণ করুন। (আদায়কারী সহ)");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        member_id: formData.member_id,
        amount: parseFloat(formData.amount),
        date: formData.date,
        donation_month: formData.donation_month,
        method: formData.method.toLowerCase(),
        receipt_no: formData.receipt_no,
        collected_by: formData.collected_by,
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
    } catch (err: any) {
      console.error("Error saving donation:", err);
      alert(`সেভ করতে সমস্যা হয়েছে: ${err.message || "Unknown error"}`);
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

  const handleShare = async (donation: any) => {
    try {
      const response = await fetch(`/api/receipts/${donation.id}`);
      const blob = await response.blob();
      const file = new File([blob], `receipt_${donation.receipt_no}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        const shareText = `আসসালামু আলাইকুম, ${donation.members?.name}।\n\nদৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশনে আপনার অনুদানটি সফলভাবে গ্রহণ করা হয়েছে।\n\nরসিদ নং: ${donation.receipt_no}\nপরিমাণ: ৳${donation.amount}/-\nতারিখ: ${donation.date}\n\nআপনার মহানুভবতার জন্য ধন্যবাদ!`;
        await navigator.share({
          files: [file],
          title: 'অনুদান রসিদ',
          text: shareText,
        });
      } else {
        // Fallback: Download and alert
        const receiptUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = receiptUrl;
        link.download = `receipt_${donation.receipt_no}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert("আপনার ব্রাউজারে সরাসরি শেয়ার সাপোর্ট করে না। রসিদটি ডাউনলোড করা হয়েছে, এখন আপনি এটি শেয়ার করতে পারেন।");
      }
    } catch (err) {
      console.error("Error sharing:", err);
      alert("শেয়ার করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
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
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 touch-spacing">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-tiro text-gray-900 mb-1">অনুদান ও জমা</h1>
          <p className="text-sm text-gray-500 font-medium">ফাউন্ডেশনের সকল জমার হিসাব</p>
        </div>
        {isStaff && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 btn-emerald h-12 px-6"
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

        <div className="divide-y divide-gray-50 bg-gray-50/30">
          {filteredDonations.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <Wallet size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold font-tiro text-sm">কোনো অনুদানের তথ্য পাওয়া যায়নি।</p>
            </div>
          ) : (
            filteredDonations.map((d) => (
              <div key={d.id} className="p-5 sm:p-6 bg-white hover:bg-emerald-50/30 transition-all group relative border-b border-gray-50 last:border-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-100 group-hover:scale-105 transition-transform">
                      {d.members?.name?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-[15px] sm:text-base font-bold text-gray-900 font-tiro">{d.members?.name || 'অজ্ঞাত'}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium bg-gray-50 px-2 py-0.5 rounded-md">
                          <Calendar size={12} className="text-emerald-600" />
                          {d.date}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-bold tracking-tighter uppercase bg-gray-50 px-2 py-0.5 rounded-md">
                          <span className="text-emerald-600 opacity-50">#</span>{d.receipt_no}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10">
                    <div className="text-right">
                      <p className="text-lg sm:text-xl font-bold text-emerald-600 font-tiro">৳{Number(d.amount).toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{d.donation_month || 'সাধারণ'}</p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/receipts/${d.id}`);
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            setPreviewUrl(url);
                          } catch (err) {
                            console.error("Error previewing:", err);
                            alert("প্রিভিউ করতে সমস্যা হয়েছে।");
                          }
                        }}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                        title="প্রিভিউ"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handleShare(d)}
                        className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-90"
                        title="শেয়ার"
                      >
                        <Share2 size={18} />
                      </button>
                      <button 
                        onClick={() => window.open(`/api/receipts/${d.id}`, "_blank")}
                        className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all active:scale-90"
                        title="ডাউনলোড"
                      >
                        <Download size={18} />
                      </button>
                      
                      {isStaff && (
                        <div className="flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-gray-100">
                          <button 
                            onClick={() => handleOpenModal(d)}
                            className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                            title="এডিট"
                          >
                            <Edit2 size={18} />
                          </button>
                          {isAdmin && (
                            <button 
                              onClick={() => handleDelete(d.id)}
                              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                              title="ডিলিট"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
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

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setPreviewUrl(null)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-emerald-600 text-white">
              <h2 className="text-lg font-bold font-tiro">রসিদ প্রিভিউ</h2>
              <button onClick={() => setPreviewUrl(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
              <img src={previewUrl} alt="Receipt Preview" className="max-w-full shadow-lg rounded-lg" />
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-center gap-4 bg-white">
              <button 
                onClick={() => window.open(previewUrl, "_blank")}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
              >
                <Download size={18} />
                <span>ডাউনলোড করুন</span>
              </button>
              <button 
                onClick={() => setPreviewUrl(null)}
                className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <label className="text-sm font-bold text-gray-700">মাসের নাম</label>
                  <input 
                    type="month" 
                    value={formData.donation_month}
                    onChange={(e) => setFormData({...formData, donation_month: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">পেমেন্ট মেথড</label>
                  <select 
                    value={formData.method}
                    onChange={(e) => setFormData({...formData, method: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    <option value="cash">নগদ (Cash)</option>
                    <option value="bkash">বিকাশ (bKash)</option>
                    <option value="nagad">নগদ (Nagad)</option>
                    <option value="bank">ব্যাংক (Bank)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">আদায়কারী (টাকা গ্রহণ করেছেন) *</label>
                <select 
                  value={formData.collected_by}
                  onChange={(e) => setFormData({...formData, collected_by: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                >
                  <option value="">আদায়কারী সিলেক্ট করুন</option>
                  {treasurers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                  ))}
                </select>
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
