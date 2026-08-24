"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { 
  Users, Shield, CheckCircle, XCircle, 
  Trash2, Key, Search, Filter, 
  UserCheck, UserMinus, AlertCircle, X, ChevronRight
} from "lucide-react";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState({ text: "", type: "" });

  const fetchData = async () => {
    setLoading(true);
    const { data: userData } = await supabase().from("users").select("*").order("created_at", { ascending: false });
    const { data: memberData } = await supabase().from("members").select("id, name, user_id");
    setUsers(userData || []);
    setMembers(memberData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase().from("users").update({ role: newRole }).eq("id", userId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    const { error } = await supabase().from("users").update({ is_approved: approved }).eq("id", userId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setResetMessage({ text: "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে", type: "error" });
      return;
    }
    setResetLoading(true);
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetUser.id, newPassword })
      });
      const result = await response.json();
      if (response.ok) {
        setResetMessage({ text: "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে", type: "success" });
        setTimeout(() => setShowResetModal(false), 2000);
      } else {
        setResetMessage({ text: result.error || "রিসেট ব্যর্থ হয়েছে", type: "error" });
      }
    } catch (err) {
      setResetMessage({ text: "সার্ভার এরর", type: "error" });
    }
    setResetLoading(false);
  };

  const getMemberName = (userId: string) => {
    return members.find(m => m.user_id === userId)?.name;
  };

  const getDisplayId = (user: any) => {
    if (!user) return "";
    return user.phone || user.email?.split('@')[0] || user.email;
  };

  const filteredUsers = users.filter(u => 
    getDisplayId(u).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getMemberName(u.id)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="touch-spacing pb-20 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-tiro text-gray-900">ইউজার কন্ট্রোল</h1>
            <p className="text-xs sm:text-sm text-gray-500">রোল এবং অ্যাক্সেস ম্যানেজমেন্ট</p>
          </div>
        </div>

        <div className="card-premium p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="ফোন বা নাম দিয়ে খুঁজুন..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:bg-white transition-all" 
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all">
              <Filter size={16} /> ফিল্টার
            </button>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-0 sm:table-container">
          {/* Mobile View */}
          <div className="sm:hidden space-y-4">
            {loading ? (
              [1, 2].map(i => (
                <div key={i} className="card-premium p-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                </div>
              ))
            ) : filteredUsers.length === 0 ? (
              <div className="card-premium p-10 text-center text-gray-400">কোনো ইউজার নেই</div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="card-premium p-4 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Shield size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{getDisplayId(u)}</p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {getMemberName(u.id) || "Not Linked"}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleApproval(u.id, !u.is_approved)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase ${u.is_approved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}
                    >
                      {u.is_approved ? 'Approved' : 'Pending'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <select 
                      value={u.role} 
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-gray-50 text-gray-700 border-none px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="treasurer">Treasurer</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setResetUser(u); setNewPassword(""); setResetMessage({ text: "", type: "" }); setShowResetModal(true); }}
                        className="p-2 text-gray-400 bg-gray-50 rounded-lg"
                      >
                        <Key size={16} />
                      </button>
                      <button className="p-2 text-rose-400 bg-rose-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="table-header">
                  <th className="px-6 py-5">ইউজার আইডি (ফোন)</th>
                  <th className="px-6 py-5">রোল (Role)</th>
                  <th className="px-6 py-5">স্ট্যাটাস</th>
                  <th className="px-6 py-5">লিঙ্ক করা মেম্বার</th>
                  <th className="px-6 py-5 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="table-row group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Shield size={18} />
                        </div>
                        <span className="text-sm font-bold text-gray-800">{getDisplayId(u)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <select 
                        value={u.role} 
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-emerald-50 text-emerald-700 border-none px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase outline-none cursor-pointer hover:bg-emerald-100 transition-colors"
                      >
                        <option value="member">Member</option>
                        <option value="treasurer">Treasurer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-5">
                      <button 
                        onClick={() => handleApproval(u.id, !u.is_approved)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${u.is_approved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}
                      >
                        {u.is_approved ? <UserCheck size={14} /> : <UserMinus size={14} />}
                        {u.is_approved ? 'Approved' : 'Pending'}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-medium text-gray-500">
                        {getMemberName(u.id) || <span className="text-gray-300 italic">Not Linked</span>}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => { setResetUser(u); setNewPassword(""); setResetMessage({ text: "", type: "" }); setShowResetModal(true); }}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          <Key size={18} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reset Password Modal - Mobile Optimized */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-emerald-950/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 bg-[#064E3B] text-white flex items-center justify-between">
              <h2 className="text-xl font-bold font-tiro flex items-center gap-2">
                <Key size={24} /> পাসওয়ার্ড রিসেট
              </h2>
              <button onClick={() => setShowResetModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-6">
              <p className="text-xs text-gray-500 leading-relaxed">
                ইউজার <span className="font-bold text-emerald-900">{getDisplayId(resetUser)}</span>-এর জন্য নতুন পাসওয়ার্ড সেট করুন।
              </p>
              
              {resetMessage.text && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-medium ${resetMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {resetMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  {resetMessage.text}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">নতুন পাসওয়ার্ড</label>
                <input 
                  type="text" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  required 
                  placeholder="অন্তত ৬ অক্ষর"
                  className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-base focus:bg-white focus:border-emerald-500/30 transition-all"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setShowResetModal(false)} className="flex-1 py-4 text-sm font-bold text-gray-500 bg-gray-50 rounded-2xl">বাতিল</button>
                <button type="submit" disabled={resetLoading} className="flex-1 py-4 text-sm font-bold text-white bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-900/20">
                  {resetLoading ? "সিঙ্ক..." : "রিসেট করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
