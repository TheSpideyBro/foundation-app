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
    monthly_pledge: "0"
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase().from("members").select("*").order("name");
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
        monthly_pledge: (member.monthly_pledge || 0).toString()
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: "",
        phone: "",
        address: "",
        join_date: new Date().toISOString().split('T')[0],
        status: "active",
        monthly_pledge: "0"
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
        ...formData,
        monthly_pledge: parseFloat(formData.monthly_pledge),
        user_id: editingMember?.user_id || user?.id // Simplified for now
      };

      if (editingMember) {
        const { error } = await supabase()
          .from("members")
          .update(payload)
          .eq("id", editingMember.id);
        if (error) throw error;
      } else {
        const { error } = await supabase()
          .from("members")
          .insert([payload]);
        if (error) throw error;
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
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">সদস্য তালিকা</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের সকল নিবন্ধিত সদস্য</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:gap-px bg-gray-50">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white p-6 hover:bg-emerald-50/30 transition-all group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-100">
                  {member.name[0]}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${member.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenModal(member)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors active:scale-90"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(member.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors active:scale-90"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="text-[17px] font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">{member.name}</h3>
              <p className="text-xs text-gray-400 font-medium mb-4">{member.role || 'সদস্য'}</p>
              
              <div className="space-y-2.5 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone size={14} className="text-emerald-600" /> {member.phone || 'ফোন নেই'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={14} className="text-emerald-600" /> {member.address || 'ঠিকানা নেই'}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50/50">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">মাসিক অঙ্গীকার</span>
                  <span className="text-sm font-bold text-emerald-600 font-tiro">৳{Number(member.monthly_pledge || 0).toLocaleString()}</span>
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
