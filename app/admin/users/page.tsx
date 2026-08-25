"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { 
  Users, Shield, CheckCircle, XCircle, 
  Trash2, Key, Search, Filter, Mail, AlertCircle
} from "lucide-react";
import { useAuth } from "@/components/providers";

export default function AdminUsersPage() {
  const { user: authUser, role: authRole } = useAuth();
  const isAdmin = authRole === 'admin' || authUser?.email === 'saddamakash234@gmail.com';

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Profile creation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    join_date: new Date().toISOString().split('T')[0],
    monthly_pledge: "0"
  });

  const fetchUsers = async () => {
    try {
      const { data } = await supabase().from("users").select("*").order("created_at", { ascending: false });
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase()
        .from("users")
        .update({ is_approved: !currentStatus })
        .eq("id", userId);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      alert("অ্যাপ্রুভ করতে সমস্যা হয়েছে।");
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase()
        .from("users")
        .update({ role: newRole })
        .eq("id", userId);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      alert("রোল পরিবর্তন করতে সমস্যা হয়েছে।");
    }
  };

  const handleOpenProfileModal = (user: any) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || "",
      phone: user.phone || "",
      address: "",
      join_date: new Date().toISOString().split('T')[0],
      monthly_pledge: "0"
    });
    setIsModalOpen(true);
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Create member record
      const { data: memberData, error: memberError } = await supabase()
        .from("members")
        .insert([{
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          join_date: formData.join_date,
          monthly_pledge: parseFloat(formData.monthly_pledge),
          user_id: selectedUser.id,
          status: 'active'
        }])
        .select()
        .single();

      if (memberError) throw memberError;

      // 2. Link user to member
      const { error: userError } = await supabase()
        .from("users")
        .update({ member_id: memberData.id })
        .eq("id", selectedUser.id);

      if (userError) throw userError;

      alert("সদস্য প্রোফাইল সফলভাবে তৈরি ও লিঙ্ক করা হয়েছে!");
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error("Error creating profile:", err);
      alert("প্রোফাইল তৈরি করতে সমস্যা হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 font-tiro mb-2">অনুমতি নেই</h2>
        <p className="text-gray-500 max-w-md">এই পেজটি শুধুমাত্র অ্যাডমিনদের জন্য সংরক্ষিত।</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">ইউজার ম্যানেজমেন্ট</h1>
          <p className="text-gray-500 text-[14px]">অ্যাপ ব্যবহারকারীদের তালিকা ও রোল নিয়ন্ত্রণ</p>
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="ইউজার বা ফোন খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-[14px] outline-none focus:bg-white transition-all" 
            />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {users.filter(u => 
            u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            u.phone?.includes(searchQuery) || 
            u.name?.toLowerCase().includes(searchQuery.toLowerCase())
          ).map((user) => (
            <div key={user.id} className="p-6 hover:bg-gray-50/50 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900">{user.name || 'নাম নেই'}</p>
                    <p className="text-[12px] text-gray-500">{user.email}</p>
                    {user.phone && <p className="text-[11px] text-gray-400 font-bold">{user.phone}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase rounded-lg tracking-wider">
                        {user.role}
                      </span>
                      {user.is_approved ? (
                        <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase">
                          <CheckCircle size={10} /> অনুমোদিত
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] text-amber-600 font-bold uppercase">
                          <XCircle size={10} /> পেন্ডিং
                        </span>
                      )}
                      {user.member_id ? (
                        <span className="flex items-center gap-1 text-[9px] text-blue-600 font-bold uppercase">
                          <Shield size={10} /> প্রোফাইল লিঙ্কড
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] text-rose-600 font-bold uppercase">
                          <AlertCircle size={10} /> প্রোফাইল নেই
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!user.member_id && user.is_approved && (
                    <button 
                      onClick={() => handleOpenProfileModal(user)}
                      className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[12px] font-bold hover:bg-blue-100 transition-all"
                    >
                      প্রোফাইল তৈরি করুন
                    </button>
                  )}
                  <select 
                    value={user.role} 
                    onChange={(e) => handleChangeRole(user.id, e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border-none rounded-lg text-[12px] font-bold outline-none"
                  >
                    <option value="member">সদস্য</option>
                    <option value="treasurer">কোষাধ্যক্ষ</option>
                    <option value="admin">অ্যাডমিন</option>
                  </select>
                  <button 
                    onClick={() => handleToggleApproval(user.id, user.is_approved)}
                    className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                      user.is_approved ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {user.is_approved ? 'বাতিল' : 'অনুমোদন'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white">
              <div>
                <h2 className="text-xl font-bold font-tiro text-white">সদস্য প্রোফাইল তৈরি করুন</h2>
                <p className="text-blue-100 text-xs mt-1">ইউজার: {selectedUser?.phone || selectedUser?.email}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="p-6 sm:p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">সদস্যের নাম *</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="পুরো নাম বাংলায় লিখুন"
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="017XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">যোগদানের তারিখ *</label>
                  <input 
                    type="date"
                    value={formData.join_date}
                    onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="গ্রাম, ডাকঘর, উপজেলা"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">মাসিক অঙ্গীকার (৳)</label>
                <input 
                  type="number"
                  value={formData.monthly_pledge}
                  onChange={(e) => setFormData({...formData, monthly_pledge: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="৫০০"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? 'সেভ হচ্ছে...' : 'প্রোফাইল তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
