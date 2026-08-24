"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { logAudit } from "@/lib/audit";
import { triggerSheetsSync } from "@/lib/sheets-auto";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { Phone, MapPin, Calendar, Plus, Search, Filter, X, Trash2, Edit2, History, HandCoins, Link as LinkIcon, User } from "lucide-react";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

export default function MembersPage() {
  const { user, role } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingMember, setLinkingMember] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [formPledge, setFormPledge] = useState("0");
  const [loading, setLoading] = useState(true);
  const [histMember, setHistMember] = useState<any | null>(null);
  const [histDonations, setHistDonations] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const fetchMembers = async () => {
    if (user === undefined) return;
    setLoading(true);
    try {
      const { data } = await supabase()
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: donations } = await supabase()
        .from("donations")
        .select("member_id, amount");

      const totals: Record<string, number> = {};
      (donations || []).forEach((d: any) => {
        totals[d.member_id] = (totals[d.member_id] || 0) + (d.amount || 0);
      });

      const withTotals = (data || []).map((m: any) => ({
        ...m,
        total_donation: totals[m.id] || 0,
      }));

      setMembers(withTotals);

      if (role === 'admin') {
        const { data: userData } = await supabase().from("users").select("*");
        setUsers(userData || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [user, role]);

  const resetForm = () => {
    setFormName(""); setFormPhone(""); setFormAddress(""); setFormStatus("active"); setFormPledge("0");
    setEditingId(null); setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const pledgeNum = parseFloat(formPledge) || 0;
    
    if (editingId) {
      const { error } = await supabase().from("members").update({ 
        name: formName, phone: formPhone, address: formAddress, status: formStatus, monthly_pledge: pledgeNum 
      }).eq("id", editingId);
      if (error) { alert(error.message); setLoading(false); return; }
      logAudit("member.update", "members", editingId, { name: formName });
    } else {
      const { error, data } = await supabase().from("members").insert([{ 
        name: formName, phone: formPhone, address: formAddress, status: formStatus, monthly_pledge: pledgeNum 
      }]).select();
      if (error) { alert(error.message); setLoading(false); return; }
      logAudit("member.insert", "members", data?.[0]?.id, { name: formName });
    }
    triggerSheetsSync();
    resetForm();
    fetchMembers();
  };

  const handleLinkUser = async () => {
    if (!linkingMember || !selectedUserId) return;
    setLoading(true);
    const { error } = await supabase()
      .from("members")
      .update({ user_id: selectedUserId })
      .eq("id", linkingMember.id);
    
    if (error) {
      alert("লিঙ্ক করা সম্ভব হয়নি: " + error.message);
    } else {
      logAudit("member.link_user", "members", linkingMember.id, { user_id: selectedUserId });
      setShowLinkModal(false);
      setLinkingMember(null);
      setSelectedUserId("");
      fetchMembers();
    }
    setLoading(false);
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone || "").includes(search)
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[19px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>সদস্য তালিকা</h1>
        {(role === "admin" || role === "treasurer") && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-sm hover:brightness-105 transition" style={{ background: C.gold, color: C.ink }}>
            <Plus size={15} strokeWidth={2.5} /> নতুন সদস্য
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-sm border px-3 py-2 mb-4" style={{ background: C.paper, borderColor: C.border }}>
        <Search size={15} style={{ color: C.sub }} />
        <input placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-[13px] outline-none flex-1" style={{ fontFamily: "'Hind Siliguri', sans-serif", color: C.text }} />
      </div>

      {/* Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((m) => (
          <div key={m.id} className="bg-white p-5 rounded-sm border relative group" style={{ borderColor: C.border }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-[16px] font-bold" style={{ color: C.ink, fontFamily: "'Tiro Bangla', serif" }}>{m.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-[12px]" style={{ color: C.sub }}>
                  <span className="flex items-center gap-1"><Phone size={12} /> {m.phone || "—"}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {m.address || "—"}</span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {m.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: C.border + "4D" }}>
              <div>
                <p className="text-[10px] uppercase font-bold" style={{ color: C.label }}>মোট দান</p>
                <p className="text-[15px] font-bold" style={{ color: C.ink }}>৳{m.total_donation.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {role === 'admin' && (
                  <button 
                    onClick={() => { setLinkingMember(m); setSelectedUserId(m.user_id || ""); setShowLinkModal(true); }}
                    className={`p-2 rounded-sm transition ${m.user_id ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50'}`}
                    title={m.user_id ? "ইউজার লিঙ্ক করা আছে" : "ইউজার লিঙ্ক করুন"}
                  >
                    <LinkIcon size={14} />
                  </button>
                )}
                <button onClick={() => { setEditingId(m.id); setFormName(m.name); setFormPhone(m.phone || ""); setFormAddress(m.address || ""); setFormStatus(m.status); setFormPledge(String(m.monthly_pledge || 0)); setShowForm(true); }} className="p-2 text-gray-500 hover:bg-gray-50 rounded-sm"><Edit2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Link User Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowLinkModal(false)}>
          <div className="w-full max-w-md rounded-sm border overflow-hidden" style={{ background: C.paper, borderColor: C.border }} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b" style={{ borderColor: C.border }}>
              <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif" }}>ইউজার অ্যাকাউন্ট লিঙ্ক করুন</h2>
              <p className="text-[12px] text-gray-500 mt-1">{linkingMember?.name}-এর জন্য একটি ইউজার সিলেক্ট করুন</p>
            </div>
            <div className="p-6 space-y-4">
              <select 
                value={selectedUserId} 
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none border"
                style={{ background: "#fff", borderColor: C.border }}
              >
                <option value="">সিলেক্ট করুন...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                ))}
              </select>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowLinkModal(false)} className="flex-1 py-2 text-[13px] border rounded-sm" style={{ borderColor: C.border }}>বাতিল</button>
                <button onClick={handleLinkUser} className="flex-1 py-2 text-[13px] font-bold rounded-sm text-white" style={{ background: C.ink }}>লিঙ্ক করুন</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Simplified for brevity) */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={resetForm}>
          <div className="w-full max-w-md rounded-sm border overflow-hidden" style={{ background: C.paper, borderColor: C.border }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.border }}>
              <h2 className="text-[15px] font-semibold">{editingId ? "সদস্য সম্পাদনা" : "নতুন সদস্য"}</h2>
              <button onClick={resetForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <input placeholder="নাম" value={formName} onChange={e => setFormName(e.target.value)} required className="w-full border p-2 text-[13px]" />
              <input placeholder="ফোন" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full border p-2 text-[13px]" />
              <input placeholder="ঠিকানা" value={formAddress} onChange={e => setFormAddress(e.target.value)} className="w-full border p-2 text-[13px]" />
              <input placeholder="মাসিক প্রতিশ্রুতি" type="number" value={formPledge} onChange={e => setFormPledge(e.target.value)} className="w-full border p-2 text-[13px]" />
              <select value={formStatus} onChange={e => setFormStatus(e.target.value as any)} className="w-full border p-2 text-[13px]">
                <option value="active">সক্রিয়</option>
                <option value="inactive">নিষ্ক্রিয়</option>
              </select>
              <button className="w-full py-2.5 font-bold text-white" style={{ background: C.gold }}>{editingId ? "আপডেট" : "যোগ করুন"}</button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
