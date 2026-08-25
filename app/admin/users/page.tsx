"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { 
  Users, Shield, CheckCircle, XCircle, 
  Trash2, Key, Search, Filter, Mail
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

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
            <input type="text" placeholder="ইউজার খুঁজুন..." className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-[14px] outline-none focus:bg-white transition-all" />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {users.map((user) => (
            <div key={user.id} className="p-6 hover:bg-gray-50/50 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900">{user.email}</p>
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
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
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
    </div>
  );
}
