"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
import { 
  Plus, 
  Search, 
  Download, 
  Share2, 
  Eye, 
  FileText, 
  Calendar, 
  Trash2, 
  Edit2, 
  X,
  AlertCircle,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

interface Donation {
  id: string;
  member_id: string;
  amount: number;
  date: string;
  donation_month: string;
  donation_end_month?: string | null;
  receipt_no: string;
  method: string;
  collected_by: string;
  batch_id?: string;
  members: {
    name: string;
    phone: string;
  };
}

interface Member {
  id: string;
  name: string;
  phone: string;
}

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [treasurers, setTreasurers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    member_id: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    donation_month: format(new Date(), "yyyy-MM"),
    end_month: format(new Date(), "yyyy-MM"),
    is_batch: false,
    method: "cash",
    collected_by: "",
    receipt_no: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showModal && !formData.receipt_no) {
      setFormData(prev => ({
        ...prev,
        receipt_no: `R-${Math.floor(100000 + Math.random() * 900000)}`
      }));
    }
  }, [showModal]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: donationsData, error: donationsError } = await supabase
        .from("donations")
        .select(`
          *,
          members (name, phone)
        `)
        .order("date", { ascending: false });

      if (donationsError) throw donationsError;
      setDonations(donationsData || []);

      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("id, name, phone")
        .order("name");

      if (membersError) throw membersError;
      setMembers(membersData || []);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, phone, role")
        .in("role", ["admin", "treasurer"]);

      if (usersError) throw usersError;
      setTreasurers(usersData.map(u => ({ 
        id: u.id, 
        name: u.name || "Unknown", 
        phone: u.phone || "" 
      })));

    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (formData.is_batch) {
        const start = new Date(formData.donation_month + "-01");
        const end = new Date(formData.end_month + "-01");
        
        if (end < start) {
          throw new Error("শেষ মাস শুরু মাসের আগে হতে পারে না");
        }

        const months = [];
        let current = new Date(start);
        while (current <= end) {
          months.push(format(current, "yyyy-MM"));
          current.setMonth(current.getMonth() + 1);
        }

        const totalAmount = parseFloat(formData.amount);
        const { error: insertError } = await supabase
          .from("donations")
          .insert([{
            member_id: formData.member_id,
            amount: totalAmount,
            date: formData.date,
            donation_month: formData.donation_month,
            donation_end_month: formData.end_month,
            method: formData.method,
            collected_by: formData.collected_by,
            batch_id: crypto.randomUUID(),
            receipt_no: formData.receipt_no
          }]);

        if (insertError) throw insertError;
      } else {
        const { error: insertError } = await supabase
          .from("donations")
          .insert([{
            member_id: formData.member_id,
            amount: parseFloat(formData.amount),
            date: formData.date,
            donation_month: formData.donation_month,
            method: formData.method,
            collected_by: formData.collected_by,
            receipt_no: formData.receipt_no
          }]);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        fetchData();
        setFormData({
          member_id: "",
          amount: "",
          date: format(new Date(), "yyyy-MM-dd"),
          donation_month: format(new Date(), "yyyy-MM"),
          end_month: format(new Date(), "yyyy-MM"),
          is_batch: false,
          method: "cash",
          collected_by: "",
          receipt_no: ""
        });
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই জমাটি ডিলিট করতে চান?")) return;

    try {
      const { error } = await supabase
        .from("donations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Error deleting: " + err.message);
    }
  }

  const filteredDonations = donations.filter(d => 
    d.members?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.receipt_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 md:pb-8">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-600" />
              অনুদান ও জমা
            </h1>
            <p className="text-[10px] md:text-xs text-gray-500 font-medium mt-0.5">ফাউন্ডেশনের সকল জমার হিসাব</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-200 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">নতুন জমা</span>
            <span className="md:hidden">নতুন</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="সদস্য বা রসিদ নং খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">লোড হচ্ছে...</p>
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-gray-900 font-bold">কোনো জমা পাওয়া যায়নি</h3>
            <p className="text-gray-500 text-sm mt-1">অনুগ্রহ করে অন্য কিছু লিখে খুঁজুন</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDonations.map((donation) => (
              <div key={donation.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                {donation.batch_id && (
                  <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-emerald-100">
                    অগ্রিম
                  </div>
                )}
                
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xl shrink-0">
                    {donation.members?.name[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate pr-8">{donation.members?.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-[11px] text-gray-500 font-medium">
                        {format(new Date(donation.date), "dd MMM, yyyy", { locale: bn })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl mb-4">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">রসিদ নং</p>
                    <p className="text-sm font-black text-gray-900">#{donation.receipt_no}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">পরিমাণ</p>
                    <p className="text-lg font-black text-emerald-600">৳{donation.amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-5 px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-bold text-gray-700">                        {donation.donation_end_month && donation.donation_end_month !== donation.donation_month
                          ? `${donation.donation_month} – ${donation.donation_end_month}`
                          : donation.donation_month}
</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase bg-white px-2 py-0.5 rounded-full border border-gray-100">
                    {donation.method === 'cash' ? 'নগদ' : donation.method.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-dashed border-gray-100">
                  <button 
                    onClick={() => window.open(`/api/receipts/${donation.id}`, '_blank')}
                    className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    প্রিভিউ
                  </button>
                  <button className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all active:scale-95">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/api/receipts/${donation.id}?download=1`;
                      link.download = `Receipt-${donation.receipt_no}.jpg`;
                      link.click();
                    }}
                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all active:scale-95">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(donation.id)}
                    className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-600 p-6 text-white relative">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute right-6 top-6 p-2 hover:bg-white/20 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black">নতুন অনুদান যোগ করুন</h2>
              <p className="text-emerald-100 text-sm mt-1">সঠিক তথ্য প্রদান করে সেভ করুন</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-3 border border-red-100">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-3 border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  সফলভাবে সেভ করা হয়েছে!
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">সদস্য নির্বাচন করুন *</label>
                <select 
                  value={formData.member_id}
                  onChange={(e) => setFormData({...formData, member_id: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
                  <label className="text-sm font-bold text-gray-700">টাকার পরিমাণ *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">তারিখ *</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.is_batch}
                    onChange={(e) => setFormData({...formData, is_batch: e.target.checked})}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-bold text-gray-700">অগ্রিম/একাধিক মাসের চাঁদা</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">{formData.is_batch ? 'শুরু মাস' : 'মাসের নাম'}</label>
                  <input 
                    type="month" 
                    value={formData.donation_month}
                    onChange={(e) => setFormData({...formData, donation_month: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                    required
                  />
                </div>
                {formData.is_batch && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">শেষ মাস</label>
                    <input 
                      type="month" 
                      value={formData.end_month}
                      onChange={(e) => setFormData({...formData, end_month: e.target.value})}
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                      required
                    />
                  </div>
                )}
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
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] px-6 py-3.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      সেভ হচ্ছে...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      সেভ করুন
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
// Force deploy Wed Aug 26 17:57:25 UTC 2026
