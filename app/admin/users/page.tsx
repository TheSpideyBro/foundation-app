"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { logAudit } from "@/lib/audit";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { User, Shield, Phone, Mail, Link as LinkIcon, CheckCircle, XCircle, Trash2, Key, AlertCircle, X } from "lucide-react";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

export default function UserManagementPage() {
  const { user, role } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Password Reset State
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

  useEffect(() => { if (role === 'admin') fetchData(); }, [role]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase().from("users").update({ role: newRole }).eq("id", userId);
    if (error) alert(error.message);
    else {
      logAudit("user.role_update", "users", userId, { role: newRole });
      fetchData();
    }
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    const { error } = await supabase().from("users").update({ is_approved: approved }).eq("id", userId);
    if (error) alert(error.message);
    else {
      logAudit(approved ? "user.approve" : "user.reject", "users", userId, {});
      fetchData();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setResetMessage({ text: "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে", type: "error" });
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUser.id, newPassword })
      });
      const data = await res.json();
      if (data.error) {
        setResetMessage({ text: "ত্রুটি: " + data.error, type: "error" });
      } else {
        setResetMessage({ text: "পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!", type: "success" });
        logAudit("user.password_reset", "users", resetUser.id, {});
        setTimeout(() => setShowResetModal(false), 2000);
      }
    } catch (err) {
      setResetMessage({ text: "সার্ভার এরর", type: "error" });
    } finally {
      setResetLoading(false);
    }
  };

  const getMemberName = (userId: string) => {
    const m = members.find(m => m.user_id === userId);
    return m ? m.name : null;
  };

  const getDisplayId = (u: any) => {
    if (u.phone) return u.phone;
    if (u.email && u.email.endsWith("@foundation.app")) return u.email.split("@")[0];
    return u.email;
  };

  if (role !== 'admin') return <AppLayout><div className="p-10 text-center">অনুমতি নেই</div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[19px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>ইউজার কন্ট্রোল</h1>
      </div>

      <div className="bg-white rounded-sm border overflow-hidden" style={{ borderColor: C.border }}>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 font-bold border-b">
            <tr>
              <th className="px-6 py-3">ইউজার আইডি (ফোন/ইমেইল)</th>
              <th className="px-6 py-3">রোল</th>
              <th className="px-6 py-3">স্ট্যাটাস</th>
              <th className="px-6 py-3">লিঙ্কড মেম্বার</th>
              <th className="px-6 py-3 text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="text-[13px] hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {u.phone ? <Phone size={14} className="text-gray-400" /> : <Mail size={14} className="text-gray-400" />}
                    <span className="font-medium">{getDisplayId(u)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={u.role} 
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="bg-transparent border-none p-0 font-bold uppercase text-[11px] outline-none cursor-pointer"
                    style={{ color: u.role === 'admin' ? C.gold : C.ink }}
                  >
                    <option value="member">Member</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleApproval(u.id, !u.is_approved)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.is_approved ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                  >
                    {u.is_approved ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {u.is_approved ? 'Approved' : 'Pending'}
                  </button>
                </td>
                <td className="px-6 py-4 text-gray-500 italic">
                  {getMemberName(u.id) || 'Not Linked'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => { setResetUser(u); setNewPassword(""); setResetMessage({ text: "", type: "" }); setShowResetModal(true); }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-sm transition-colors"
                      title="Reset Password"
                    >
                      <Key size={14} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !resetLoading && setShowResetModal(false)}>
          <div className="bg-white w-full max-w-md rounded-sm border shadow-xl" onClick={e => e.stopPropagation()} style={{ background: C.paper, borderColor: C.border }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
              <h2 className="text-[15px] font-bold flex items-center gap-2" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                <Key size={18} /> পাসওয়ার্ড রিসেট
              </h2>
              <button onClick={() => setShowResetModal(false)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-[12px] text-gray-600">ইউজার: <b>{getDisplayId(resetUser)}</b>-এর জন্য নতুন পাসওয়ার্ড সেট করুন।</p>
              {resetMessage.text && (
                <div className={`p-3 rounded-sm flex items-center gap-2 text-[12px] ${resetMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resetMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {resetMessage.text}
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">নতুন পাসওয়ার্ড</label>
                <input 
                  type="text" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  required 
                  placeholder="অন্তত ৬ অক্ষরের পাসওয়ার্ড"
                  className="w-full px-3 py-2 bg-white border rounded-sm outline-none text-[13px]"
                  style={{ borderColor: C.border }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowResetModal(false)} className="flex-1 py-2 text-[13px] border rounded-sm" style={{ borderColor: C.border }}>বাতিল</button>
                <button type="submit" disabled={resetLoading} className="flex-1 py-2 text-[13px] font-bold rounded-sm text-white" style={{ background: C.ink }}>
                  {resetLoading ? "প্রক্রিয়া চলছে..." : "রিসেট করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
