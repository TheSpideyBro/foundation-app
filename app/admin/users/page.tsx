"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { Search, Shield, User, CheckCircle, XCircle, Trash2, Link as LinkIcon } from "lucide-react";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

export default function UserManagementPage() {
  const { user, role } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (role !== 'admin') return;
    setLoading(true);
    try {
      const { data: userData } = await supabase().from("users").select("*").order("created_at", { ascending: false });
      const { data: memberData } = await supabase().from("members").select("id, name, user_id");
      setUsers(userData || []);
      setMembers(memberData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [role]);

  const handleToggleApproval = async (id: string, current: boolean) => {
    const { error } = await supabase().from("users").update({ is_approved: !current }).eq("id", id);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    const { error } = await supabase().from("users").update({ role: newRole }).eq("id", id);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("এই ইউজারকে পুরোপুরি মুছে ফেলতে চান? এটি অপরিবর্তনীয়।")) return;
    const { error } = await supabase().from("users").delete().eq("id", id);
    if (error) alert(error.message);
    else fetchData();
  };

  const filtered = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  if (role !== 'admin') return <AppLayout><div className="p-10 text-center">Unauthorized</div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[19px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>ইউজার ম্যানেজমেন্ট</h1>
      </div>

      <div className="flex items-center gap-2 rounded-sm border px-3 py-2 mb-6" style={{ background: C.paper, borderColor: C.border }}>
        <Search size={15} style={{ color: C.sub }} />
        <input placeholder="ইমেইল দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-[13px] outline-none flex-1" />
      </div>

      <div className="bg-white rounded-sm border overflow-hidden" style={{ borderColor: C.border }}>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500">
            <tr>
              <th className="px-6 py-3">ইউজার ইমেইল</th>
              <th className="px-6 py-3">রোল (Role)</th>
              <th className="px-6 py-3">স্ট্যাটাস</th>
              <th className="px-6 py-3">লিঙ্কড মেম্বার</th>
              <th className="px-6 py-3 text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y text-[13px]" style={{ borderColor: C.border }}>
            {filtered.map(u => {
              const linkedMember = members.find(m => m.user_id === u.id);
              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{u.email}</td>
                  <td className="px-6 py-4">
                    <select 
                      value={u.role} 
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-transparent border-none p-0 focus:ring-0 cursor-pointer font-bold text-[12px]"
                      style={{ color: u.role === 'admin' ? C.gold : C.ink }}
                    >
                      <option value="member">Member</option>
                      <option value="treasurer">Treasurer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleToggleApproval(u.id, u.is_approved)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.is_approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {u.is_approved ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {u.is_approved ? 'Approved' : 'Pending'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {linkedMember ? (
                      <span className="flex items-center gap-1.5 text-green-700 font-medium">
                        <LinkIcon size={12} /> {linkedMember.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not Linked</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
