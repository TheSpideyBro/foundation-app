"use client";

import { useState, useEffect, useMemo } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { logAudit } from "@/lib/audit";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { 
  Plus, Search, Filter, UserPlus, Link as LinkIcon, Unlink, 
  CheckCircle, XCircle, Edit2, 
  RefreshCw, Info, ChevronRight, Phone, CheckSquare, Square,
  MoreHorizontal, Download, Trash2
} from "lucide-react";
import Link from "next/link";

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
    if (selectedIds.length === filteredMembers.length && filteredMembers.length > 0) setSelectedIds([]);
    else setSelectedIds(filteredMembers.map(m => m.id));
  };

  const canManage = role === 'admin' || role === 'treasurer';

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">সদস্য তালিকা</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের সকল নিবন্ধিত সদস্যদের ব্যবস্থাপনা</p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <>
              <button 
                onClick={handleAutoLink}
                disabled={autoLinking}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
              >
                <RefreshCw size={16} className={autoLinking ? "animate-spin" : ""} />
                {autoLinking ? "লিঙ্ক হচ্ছে..." : "অটো-লিঙ্ক"}
              </button>
              <button 
                onClick={() => { setFormData({ name: "", phone: "", address: "", pledge_amount: 0, status: "active", user_id: "" }); setShowAddModal(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1B4332] text-white rounded-xl text-[13px] font-bold hover:bg-[#2D6A4F] transition-all shadow-lg shadow-emerald-900/20"
              >
                <Plus size={18} /> নতুন সদস্য
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#0F2922] text-white p-4 rounded-2xl mb-6 flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-[14px]">
              {selectedIds.length}
            </div>
            <span className="text-[14px] font-medium">জন সদস্য নির্বাচিত</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBulkStatus('active')} className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-[12px] font-bold border border-emerald-500/20 transition-all">Active করুন</button>
            <button onClick={() => handleBulkStatus('inactive')} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-[12px] font-bold border border-red-500/20 transition-all">Inactive করুন</button>
            <button onClick={() => setSelectedIds([])} className="px-4 py-2 text-[12px] font-bold text-white/60 hover:text-white transition-all">বাতিল</button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="card-premium p-6 mb-8 flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="সদস্যের নাম বা ফোন নম্বর দিয়ে খুঁজুন..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-[14px] outline-none focus:bg-white focus:border-emerald-500/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-2xl border border-transparent">
            <Filter size={16} className="text-gray-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-[14px] font-medium outline-none text-gray-700"
            >
              <option value="all">সব স্ট্যাটাস</option>
              <option value="active">সক্রিয় (Active)</option>
              <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
            </select>
          </div>
          <button className="p-3 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-all">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 w-16 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-emerald-600 transition-colors">
                    {selectedIds.length === filteredMembers.length && filteredMembers.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                </th>
                <th className="px-6 py-5 text-[12px] font-bold text-gray-400 uppercase tracking-wider">সদস্যের তথ্য</th>
                <th className="px-6 py-5 text-[12px] font-bold text-gray-400 uppercase tracking-wider text-center">মাসিক প্রতিশ্রুতি</th>
                <th className="px-6 py-5 text-[12px] font-bold text-gray-400 uppercase tracking-wider text-center">মোট অবদান</th>
                <th className="px-6 py-5 text-[12px] font-bold text-gray-400 uppercase tracking-wider text-center">অবস্থা</th>
                <th className="px-6 py-5 text-[12px] font-bold text-gray-400 uppercase tracking-wider">অ্যাকাউন্ট</th>
                <th className="px-6 py-5 text-right text-[12px] font-bold text-gray-400 uppercase tracking-wider">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMembers.map((m) => (
                <tr key={m.id} className={`group hover:bg-gray-50/50 transition-all ${selectedIds.includes(m.id) ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-6 py-5 text-center">
                    <button onClick={() => toggleSelect(m.id)} className={`transition-all ${selectedIds.includes(m.id) ? 'text-emerald-600 scale-110' : 'text-gray-300 group-hover:text-gray-400'}`}>
                      {selectedIds.includes(m.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[14px]">
                        {m.name[0]}
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-800">{m.name}</p>
                        <p className="text-[12px] text-gray-400 flex items-center gap-1"><Phone size={12} /> {m.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[14px] font-bold text-gray-700">৳{m.pledge_amount}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[14px] font-bold text-emerald-600">৳{m.total_donated}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${m.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {m.user_id ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-[12px] bg-emerald-50 w-fit px-3 py-1 rounded-lg">
                        <CheckCircle size={14} /> লিঙ্কড
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400 font-bold text-[12px] bg-gray-50 w-fit px-3 py-1 rounded-lg">
                        <XCircle size={14} /> লিঙ্ক নেই
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link 
                        href={`/admin/members/${m.id}`} 
                        className="p-2.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      >
                        <ChevronRight size={20} />
                      </Link>
                      {canManage && (
                        <div className="relative group/menu">
                          <button className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                            <MoreHorizontal size={20} />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 hidden group-hover/menu:block z-20 animate-in fade-in zoom-in-95 duration-200">
                            <button onClick={() => { setSelectedMember(m); setShowLinkModal(true); }} className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2">
                              <LinkIcon size={14} /> ইউজার লিঙ্ক করুন
                            </button>
                            {m.user_id && (
                              <button onClick={() => handleLinkUser(m.id, "")} className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <Unlink size={14} /> লিঙ্ক সরান
                              </button>
                            )}
                            <button className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50 mt-2">
                              <Edit2 size={14} /> তথ্য পরিবর্তন
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMembers.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
              <Search size={40} />
            </div>
            <div>
              <p className="text-[18px] font-bold text-gray-800 font-tiro">কোনো সদস্য পাওয়া যায়নি</p>
              <p className="text-gray-400 text-[14px]">অনুগ্রহ করে অন্য কোনো নাম বা নম্বর দিয়ে চেষ্টা করুন।</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-8 bg-[#0F2922] text-white flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-bold font-tiro">নতুন সদস্য যোগ করুন</h2>
                <p className="text-emerald-400/60 text-[12px] uppercase font-bold tracking-widest mt-1">সদস্য তথ্য ফরম</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleAddMember} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">সদস্যের পূর্ণ নাম</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all" placeholder="যেমন: আব্দুল করিম" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">ফোন নম্বর</label>
                  <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all" placeholder="017XXXXXXXX" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">মাসিক চাঁদা (৳)</label>
                  <input type="number" required value={formData.pledge_amount} onChange={e => setFormData({...formData, pledge_amount: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all" placeholder="৫০০" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">ইউজার অ্যাকাউন্ট লিঙ্ক করুন (ঐচ্ছিক)</label>
                <select value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all appearance-none">
                  <option value="">লিঙ্ক করবেন না</option>
                  {users.filter(u => !members.some(m => m.user_id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.phone || u.email}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full py-4 bg-[#1B4332] text-white rounded-2xl text-[16px] font-bold hover:bg-[#2D6A4F] transition-all shadow-xl shadow-emerald-900/20 mt-4">সদস্য যোগ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Link User Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <h3 className="text-[18px] font-bold font-tiro text-emerald-900">ইউজার লিঙ্ক করুন</h3>
              <button onClick={() => setShowLinkModal(false)} className="text-emerald-900/40 hover:text-emerald-900 transition-colors"><XCircle size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-600 font-bold text-[18px] shadow-sm">
                  {selectedMember?.name[0]}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-800">{selectedMember?.name}</p>
                  <p className="text-[12px] text-gray-400">{selectedMember?.phone}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">ইউজার সিলেক্ট করুন</label>
                <select 
                  className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-emerald-500/30 transition-all appearance-none"
                  onChange={(e) => handleLinkUser(selectedMember.id, e.target.value)}
                  defaultValue={selectedMember?.user_id || ""}
                >
                  <option value="">লিঙ্ক নেই</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.phone || u.email}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => setShowLinkModal(false)} className="w-full py-4 text-[14px] font-bold text-gray-500 hover:text-gray-700 transition-all">বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
