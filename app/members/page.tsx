"use client";

import { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, Filter, 
  Phone, MapPin, ChevronRight, MoreHorizontal,
  Shield, CheckCircle, XCircle, Trash2, Edit2,
  Plus, X, Save, Calendar
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";

export default function MembersPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  const isStaff = isAdmin || role === 'treasurer';
  
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    join_date: new Date().toISOString().split('T')[0],
    status: "active",
    monthly_pledge: "0",
    pledge_effective_month: new Date().toISOString().slice(0, 7),
    pledge_note: ""
  });

  useEffect(() => {
    fetchMembers();
  }, [isStaff]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const query = isStaff
        ? supabase().from("members").select("*")
        : supabase().from("member_directory").select("*");
      const { data } = await query.order("name");
      setMembers(data || []);

    } catch (err) {
      console.error("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (member: any = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        phone: member.phone || "",
        address: member.address || "",
        join_date: member.join_date,
        status: member.status,
        monthly_pledge: (member.monthly_pledge || 0).toString(),
        pledge_effective_month: new Date().toISOString().slice(0, 7),
        pledge_note: ""
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: "",
        phone: "",
        address: "",
        join_date: new Date().toISOString().split('T')[0],
        status: "active",
        monthly_pledge: "0",
        pledge_effective_month: new Date().toISOString().slice(0, 7),
        pledge_note: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.join_date) {
      alert("নাম এবং যোগদানের তারিখ আবশ্যক।");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        join_date: formData.join_date,
        status: formData.status,
        monthly_pledge: parseFloat(formData.monthly_pledge)
      };

      let savedMemberId = editingMember?.id;
      if (editingMember) {
        const { error } = await supabase()
          .from("members")
          .update(payload)
          .eq("id", editingMember.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase()
          .from("members")
          .insert([payload])
          .select("id")
          .single();
        if (error) throw error;
        savedMemberId = data.id;
      }

      if (isStaff && savedMemberId && Number.isFinite(payload.monthly_pledge) && payload.monthly_pledge >= 0) {
        const { error: historyError } = await supabase().from("member_pledge_history").insert([{
          member_id: savedMemberId,
          monthly_amount: payload.monthly_pledge,
          effective_from_month: formData.pledge_effective_month,
          note: formData.pledge_note || null
        }]);
        if (historyError) throw historyError;
      }

      setIsModalOpen(false);
      fetchMembers();
    } catch (err) {
      console.error("Error saving member:", err);
      alert("সেভ করতে সমস্যা হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই সদস্যকে ডিলিট করতে চান?")) return;
    try {
      const { error } = await supabase().from("members").delete().eq("id", id);
      if (error) throw error;
      setMembers(members.filter(m => m.id !== id));
    } catch (err) {
      console.error("Error deleting member:", err);
      alert("ডিলিট করতে সমস্যা হয়েছে।");
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone?.includes(searchQuery)
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
          <h1 className="text-3xl sm:text-4xl font-bold font-tiro text-gray-900 mb-1">সদস্য তালিকা</h1>
          <p className="text-sm text-gray-500 font-medium">ফাউন্ডেশনের সকল নিবন্ধিত সদস্য</p>
        </div>
        {isStaff && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 btn-emerald h-12 px-6"
          >
            <Plus size={20} />
            <span>নতুন সদস্য</span>
          </button>
        )}
      </div>

      <div className="card-premium overflow-hidden border border-emerald-50 shadow-sm">
        <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="সদস্যের নাম বা ফোন খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6 bg-gray-50/50">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white p-6 rounded-3xl border border-emerald-50/50 hover:shadow-xl hover:shadow-emerald-100/20 transition-all group relative">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-100 group-hover:scale-105 transition-transform">
                  {member.name[0]}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${member.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </div>
                  {isStaff && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenModal(member)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                        title="এডিট"
                      >
                        <Edit2 size={16} />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(member.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                          title="ডিলিট"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button 
                        onClick={async () => {
                          const res = await fetch(`/api/members/${member.id}/qr`).then(r => r.json());
                          if (res.qrImage) {
                            const link = document.createElement('a');
                            link.href = res.qrImage;
                            link.download = `QR_${member.name}.png`;
                            link.click();
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all active:scale-90"
                        title="কিউআর কোড"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors font-tiro">{member.name}</h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-4">{member.role || 'সদস্য'}</p>
              
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Phone size={14} />
                  </div>
                  {isStaff ? (member.phone || 'ফোন নেই') : 'পাবলিক নয়'}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <MapPin size={14} />
                  </div>
                  <span className="line-clamp-1">{isStaff ? (member.address || 'ঠিকানা নেই') : 'পাবলিক নয়'}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">মাসিক অঙ্গীকার</span>
                  <span className="text-base font-bold text-emerald-600 font-tiro">৳{Number(member.monthly_pledge || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-emerald-600 text-white">
              <div>
                <h2 className="text-xl font-bold font-tiro">{editingMember ? 'সদস্য এডিট করুন' : 'নতুন সদস্য যোগ করুন'}</h2>
                <p className="text-emerald-100 text-xs mt-1">সঠিক তথ্য প্রদান করে সেভ করুন</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">সদস্যের নাম *</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="পুরো নাম লিখুন"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">ফোন নম্বর</label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    placeholder="017XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">যোগদানের তারিখ *</label>
                  <input 
                    type="date"
                    value={formData.join_date}
                    onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">ঠিকানা</label>
                <input 
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="গ্রাম, ডাকঘর, উপজেলা"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">মাসিক অঙ্গীকার (৳)</label>
                  <input 
                    type="number"
                    inputMode="numeric"
                    value={formData.monthly_pledge}
                    onChange={(e) => setFormData({...formData, monthly_pledge: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">কার্যকর মাস</label>
                  <input
                    type="month"
                    value={formData.pledge_effective_month}
                    onChange={(e) => setFormData({...formData, pledge_effective_month: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">স্ট্যাটাস</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    <option value="active">সক্রিয়</option>
                    <option value="inactive">নিষ্ক্রিয়</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">অঙ্গীকার পরিবর্তনের নোট</label>
                <input
                  type="text"
                  value={formData.pledge_note}
                  onChange={(e) => setFormData({...formData, pledge_note: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="যেমন: নতুন মাসিক অঙ্গীকার"
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
