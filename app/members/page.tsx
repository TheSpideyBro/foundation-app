"use client";

import { useState, useEffect, useMemo } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { logAudit } from "@/lib/audit";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { 
  Plus, Search, Filter, UserPlus, Link as LinkIcon, Unlink, 
  CheckCircle, XCircle, Edit2, 
  RefreshCw, Info, ChevronRight, Phone, CheckSquare, Square
} from "lucide-react";
import Link from "next/link";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

export default function MembersPage() {
  const { role } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [autoLinking, setAutoLinking] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", address: "", pledge_amount: 0, status: "active", user_id: "" });

  const fetchData = async () => {
    setLoading(true);
    const { data: memberData } = await supabase().from("members").select("*, donations(amount)");
    const { data: userData } = await supabase().from("users").select("id, phone, email");
    
    const processedMembers = memberData?.map(m => ({
      ...m,
      total_donated: m.donations?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0
    })) || [];

    setMembers(processedMembers);
    setUsers(userData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAutoLink = async () => {
    setAutoLinking(true);
    try {
      const res = await fetch('/api/admin/auto-link', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`সফলভাবে ${data.linkedCount} জন সদস্যকে লিঙ্ক করা হয়েছে!`);
        fetchData();
      }
    } catch (err) {
      alert("অটো-লিঙ্ক ব্যর্থ হয়েছে");
    } finally {
      setAutoLinking(false);
    }
  };

  const handleBulkStatus = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase().from("members").update({ status: newStatus }).in("id", selectedIds);
    if (error) alert(error.message);
    else {
      logAudit("member.bulk_update", "members", "bulk", { ids: selectedIds, status: newStatus });
      setSelectedIds([]);
      fetchData();
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase().from("members").insert([formData]).select();
    if (error) alert(error.message);
    else {
      logAudit("member.create", "members", data[0].id, formData);
      setShowAddModal(false);
      fetchData();
    }
  };

  const handleLinkUser = async (memberId: string, userId: string) => {
    const { error } = await supabase().from("members").update({ user_id: userId || null }).eq("id", memberId);
    if (error) alert(error.message);
    else {
      logAudit(userId ? "member.link" : "member.unlink", "members", memberId, { user_id: userId });
      setShowLinkModal(false);
      fetchData();
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            m.phone.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, searchTerm, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMembers.length) setSelectedIds([]);
    else setSelectedIds(filteredMembers.map(m => m.id));
  };

  const canManage = role === 'admin' || role === 'treasurer';

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>সদস্য তালিকা</h1>
          <p className="text-[12px] text-gray-500">মোট সদস্য: {members.length} জন</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button 
                onClick={handleAutoLink}
                disabled={autoLinking}
                className="flex items-center gap-2 px-3 py-2 bg-white border rounded-sm text-[12px] font-bold hover:bg-gray-50 transition-colors"
                style={{ borderColor: C.border, color: C.ink }}
              >
                <RefreshCw size={14} className={autoLinking ? "animate-spin" : ""} />
                {autoLinking ? "লিঙ্ক হচ্ছে..." : "অটো-লিঙ্ক"}
              </button>
              <button 
                onClick={() => { setFormData({ name: "", phone: "", address: "", pledge_amount: 0, status: "active", user_id: "" }); setShowAddModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-sm text-[12px] font-bold text-white transition-transform active:scale-95"
                style={{ background: C.ink }}
              >
                <Plus size={16} /> নতুন সদস্য
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-ink text-white p-3 rounded-sm mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="text-[13px] font-bold">{selectedIds.length} জন সদস্য সিলেক্ট করা হয়েছে</span>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBulkStatus('active')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-[12px] font-medium">Active করুন</button>
            <button onClick={() => handleBulkStatus('inactive')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-[12px] font-medium">Inactive করুন</button>
            <button onClick={() => setSelectedIds([])} className="px-3 py-1 text-[12px] opacity-70 hover:opacity-100">বাতিল</button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-sm border mb-6 flex flex-col md:flex-row gap-4" style={{ borderColor: C.border }}>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="সদস্যের নাম বা ফোন নম্বর দিয়ে খুঁজুন..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-sm text-[13px] outline-none focus:ring-1 focus:ring-ink/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border-none px-3 py-2 rounded-sm text-[13px] outline-none"
          >
            <option value="all">সব স্ট্যাটাস</option>
            <option value="active">সক্রিয় (Active)</option>
            <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
          </select>
        </div>
      </div>

      {/* Members Grid/Table */}
      <div className="bg-white rounded-sm border overflow-x-auto" style={{ borderColor: C.border }}>
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 font-bold border-b">
            <tr>
              <th className="px-6 py-3 w-10">
                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-ink">
                  {selectedIds.length === filteredMembers.length && filteredMembers.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              <th className="px-6 py-3">সদস্যের তথ্য</th>
              <th className="px-6 py-3 text-center">মাসিক চাঁদা</th>
              <th className="px-6 py-3 text-center">মোট দান</th>
              <th className="px-6 py-3 text-center">স্ট্যাটাস</th>
              <th className="px-6 py-3">ইউজার অ্যাকাউন্ট</th>
              <th className="px-6 py-3 text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredMembers.map((m) => (
              <tr key={m.id} className={`text-[13px] hover:bg-gray-50 transition-colors group ${selectedIds.includes(m.id) ? 'bg-ink/5' : ''}`}>
                <td className="px-6 py-4">
                  <button onClick={() => toggleSelect(m.id)} className={`transition-colors ${selectedIds.includes(m.id) ? 'text-ink' : 'text-gray-300'}`}>
                    {selectedIds.includes(m.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-[14px]" style={{ color: C.text }}>{m.name}</span>
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Phone size={10} /> {m.phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-medium">৳{m.pledge_amount}</td>
                <td className="px-6 py-4 text-center font-bold" style={{ color: C.ink }}>৳{m.total_donated}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${m.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {m.user_id ? (
                    <div className="flex items-center gap-2 text-green-600 font-medium text-[11px]">
                      <CheckCircle size={12} /> লিঙ্কড
                      {canManage && (
                        <button onClick={() => handleLinkUser(m.id, "")} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                          <Unlink size={12} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-[11px] flex items-center gap-1"><XCircle size={12} /> লিঙ্ক নেই</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/members/${m.id}`} className="p-2 text-gray-400 hover:text-ink hover:bg-gray-100 rounded-sm transition-colors" title="View Profile">
                      <ChevronRight size={16} />
                    </Link>
                    {canManage && (
                      <button 
                        onClick={() => { setSelectedMember(m); setShowLinkModal(true); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-sm transition-colors"
                        title="Link User"
                      >
                        <LinkIcon size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredMembers.length === 0 && (
          <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-2">
            <Info size={32} className="text-gray-200" />
            <p>কোনো সদস্য পাওয়া যায়নি</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-sm border shadow-2xl" style={{ background: C.paper, borderColor: C.border }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
              <h2 className="text-[16px] font-bold" style={{ fontFamily: "'Tiro Bangla', serif" }}>নতুন সদস্য যোগ করুন</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">সদস্যের নাম</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-white border rounded-sm outline-none text-[13px]" style={{ borderColor: C.border }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">ফোন নম্বর</label>
                  <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 bg-white border rounded-sm outline-none text-[13px]" style={{ borderColor: C.border }} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">মাসিক চাঁদা (৳)</label>
                  <input type="number" required value={formData.pledge_amount} onChange={e => setFormData({...formData, pledge_amount: Number(e.target.value)})} className="w-full px-3 py-2 bg-white border rounded-sm outline-none text-[13px]" style={{ borderColor: C.border }} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">লিঙ্কড ইউজার (ঐচ্ছিক)</label>
                <select value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} className="w-full px-3 py-2 bg-white border rounded-sm outline-none text-[13px]" style={{ borderColor: C.border }}>
                  <option value="">কোনো ইউজার লিঙ্ক করবেন না</option>
                  {users.filter(u => !members.some(m => m.user_id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.phone || u.email}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full py-3 mt-4 text-[14px] font-bold text-white rounded-sm" style={{ background: C.ink }}>সদস্য যোগ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Link User Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-sm rounded-sm border shadow-xl" style={{ background: C.paper, borderColor: C.border }}>
            <div className="p-4 border-b font-bold text-[15px]">ইউজার লিঙ্ক করুন: {selectedMember?.name}</div>
            <div className="p-6 space-y-4">
              <select 
                className="w-full px-3 py-2 bg-white border rounded-sm outline-none text-[13px]"
                style={{ borderColor: C.border }}
                onChange={(e) => handleLinkUser(selectedMember.id, e.target.value)}
                defaultValue={selectedMember?.user_id || ""}
              >
                <option value="">লিঙ্ক নেই</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.phone || u.email}</option>
                ))}
              </select>
              <button onClick={() => setShowLinkModal(false)} className="w-full py-2 text-[13px] border rounded-sm" style={{ borderColor: C.border }}>বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
