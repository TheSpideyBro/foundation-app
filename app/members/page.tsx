"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { logAudit } from "@/lib/audit";
import { triggerSheetsSync } from "@/lib/sheets-auto";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { Phone, MapPin, Calendar, Plus, Search, Filter, X, Trash2, Edit2, History, HandCoins } from "lucide-react";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

export default function MembersPage() {
  const { user, role } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
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

  const openHistory = async (m: any) => {
    setHistMember(m);
    setHistDonations([]);
    setHistLoading(true);
    const { data } = await supabase()
      .from("donations")
      .select("receipt_no, amount, date, method, donation_month, created_at")
      .eq("member_id", m.id)
      .order("created_at", { ascending: false });
    setHistDonations(data || []);
    setHistLoading(false);
  };

  const fetchMembers = async () => {
    // user undefined = auth still initializing; user null = resolved, no session
    if (user === undefined) return;
    if (!user) { setLoading(false); return; }
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [user]);

  // While auth is still resolving, keep showing the spinner (page-level state)
  useEffect(() => {
    if (user === undefined) return;
    if (!user) setLoading(false);
  }, [user]);

  const resetForm = () => {
    setFormName(""); setFormPhone(""); setFormAddress(""); setFormStatus("active"); setFormPledge("0");
    setEditingId(null); setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      console.error("No user logged in");
      return;
    }
    setLoading(true);
    console.log("Inserting member with user_id:", user.id);
    const pledgeNum = parseFloat(formPledge) || 0;
    // Migration-resilient: if the database schema hasn't been updated yet (no
    // monthly_pledge column), fall back to the old column set and retry.
    console.log("[MEMBERS-FORM] MIGRATION-RESILIENT-V1 submitting, hasUser:", !!user);
    // NOTE: must use a plain GET select (not HEAD) — PostgREST returns an empty
    // body for HEAD 400 errors, so the error message would be empty and the
    // fallback would never trigger.
    const isNewSchemaReady = await supabase().from("members").select("monthly_pledge").limit(1);
    const hasPledgeCol = !(isNewSchemaReady.error && String(isNewSchemaReady.error.message).includes("monthly_pledge"));
    console.log("[MEMBERS-FORM] hasPledgeCol:", hasPledgeCol, "schemaError:", isNewSchemaReady.error?.message);
    if (editingId) {
      const { error } = await supabase().from("members").update(hasPledgeCol ? { name: formName, phone: formPhone, address: formAddress, status: formStatus, monthly_pledge: pledgeNum } : { name: formName, phone: formPhone, address: formAddress, status: formStatus }).eq("id", editingId);
      if (error) { console.error("Update error:", error); alert(rlsHint("সদস্য আপডেট করা যায়নি", error)); setLoading(false); return; }
      logAudit("member.update", "members", editingId, { name: formName, fields: ["name", "phone", "address", "status", "monthly_pledge"] });
      triggerSheetsSync();
    } else {
      const { error, data } = await supabase().from("members").insert([hasPledgeCol ? { name: formName, phone: formPhone, address: formAddress, status: formStatus, monthly_pledge: pledgeNum, user_id: user.id } : { name: formName, phone: formPhone, address: formAddress, status: formStatus, user_id: user.id }]);
      if (error) { console.error("Insert error:", error); alert(rlsHint("সদস্য যোগ করা যায়নি", error)); setLoading(false); return; }
      console.log("Inserted member:", data);
      logAudit("member.insert", "members", (data as unknown as any[] | null)?.[0]?.id, { name: formName, monthly_pledge: pledgeNum });
      triggerSheetsSync();
    }
    resetForm();
    fetchMembers().finally(() => setLoading(false));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই সদস্যকে মুছতে চান?")) return;
    const { data: rows, error } = await supabase().from("members").select("name").eq("id", id);
    if (error) {
      alert(rlsHint("সদস্য মুছা যায়নি", error));
      return;
    }
    logAudit("member.delete", "members", id, { name: rows?.[0]?.name });
    triggerSheetsSync();
    fetchMembers();
  };

  // Friendly hint when the database blocks the action (missing role row or foreign-key mismatch)
  const rlsHint = (prefix: string, error: { message: string }) => {
    if (error.message.includes("row-level security"))
      return `${prefix}: ডেটাবেসে আপনার অ্যাডমিন ভূমিকা পাওয়া যাচ্ছে না। সুপাবেস ড্যাশবোর্ডের SQL Editor-এ "fix-rls-policies-v2.sql" রান করুন বা আপনার users রোটে role = 'admin' সেট করুন।`;
    if (error.message.includes("foreign key"))
      return `${prefix}: আপনার প্রোফাইল রো users টেবিলে নেই বা .env.local ফাইলে ভুল Supabase কেয় আছে। লগ আউট করে আবার লগ ইন করুন, এবং .env.local ফাইলে সঠিক NEXT_PUBLIC_SUPABASE_URL ও ANON_KEY আছে কিনা যাচাই করুন।`;
    return `${prefix}: ${error.message}`;
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

      {/* Search */}
      <div className="flex items-center gap-2 rounded-sm border px-3 py-2 mb-4" style={{ background: C.paper, borderColor: C.border }}>
        <Search size={15} style={{ color: C.sub }} />
        <input placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-[13px] outline-none flex-1" style={{ fontFamily: "'Hind Siliguri', sans-serif", color: C.text }} />
        <Filter size={14} style={{ color: C.sub }} />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={resetForm}>
          <div className="w-full max-w-md rounded-sm border overflow-hidden" style={{ background: C.paper, borderColor: C.border }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>{editingId ? "সদস্য সম্পাদনা" : "নতুন সদস্য যোগ করুন"}</h2>
              <button onClick={resetForm}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>নাম *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2" style={{ background: "#fff", borderColor: C.border, boxShadow: `0 0 0 2px ${C.gold}` }} />
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>ফোন</label>
                <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2" style={{ background: "#fff", borderColor: C.border }} />
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>ঠিকানা</label>
                <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2" style={{ background: "#fff", borderColor: C.border }} />
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>প্রতি মাসে প্রতিশ্রুতি (টাকা)</label>
                <input type="number" min="0" step="100" value={formPledge} onChange={(e) => setFormPledge(e.target.value)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2" style={{ background: "#fff", borderColor: C.border }} />
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>স্ট্যাটাস</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as typeof formStatus)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2" style={{ background: "#fff", borderColor: C.border }}>
                  <option value="active">সক্রিয়</option>
                  <option value="inactive">নিষ্ক্রিয়</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-sm text-[13.5px] font-semibold transition hover:brightness-105 disabled:opacity-60" style={{ background: C.gold, color: C.ink, pointerEvents: loading ? "none" : "auto" }}>
                {editingId ? "আপডেট করুন" : "যোগ করুন"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Donation History Modal */}
      {histMember && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setHistMember(null)}>
          <div className="w-full max-w-lg max-h-[80vh] rounded-sm border overflow-hidden flex flex-col" style={{ background: C.paper, borderColor: C.border }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-4 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <HandCoins size={16} style={{ color: C.ink }} />
                <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>{histMember.name} — দানের ইতিহাস</h2>
              </div>
              <button onClick={() => setHistMember(null)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            <div className="px-6 py-2 shrink-0">
              <span className="text-[12.5px]" style={{ color: C.label }}>মোট দান: </span>
              <span className="text-[15px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.ink }}>৳{(histDonations || []).reduce((s, d: any) => s + (d.amount || 0), 0).toLocaleString()}</span>
              {(histMember.monthly_pledge ?? 0) > 0 && (
                <span className="text-[12px] ml-3 px-2 py-0.5 rounded-full" style={{ background: C.gold + "1A", color: C.ink }}>মাসিক প্রতিশ্রুতি: ৳{Number(histMember.monthly_pledge).toLocaleString()}</span>
              )}
            </div>
            <div className="overflow-y-auto px-6 pb-4">
              {histLoading ? (
                <div className="py-8 text-center text-[13px]" style={{ color: C.sub }}>লোড হচ্ছে...</div>
              ) : histDonations.length === 0 ? (
                <div className="py-8 text-center text-[13px]" style={{ color: C.sub }}>এই সদস্যের কোনো দানের এন্ট্রি নেই</div>
              ) : (
                <div className="divide-y" style={{ borderColor: C.border }}>
                  {histDonations.map((d: any) => (
                    <div key={d.receipt_no + d.created_at} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: C.text }}>{d.receipt_no}</p>
                        <p className="text-[11.5px]" style={{ color: C.sub }}>
                          {!isNaN(new Date(d.date).getTime()) ? new Date(d.date).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" }) : d.date}
                          {d.method && ` · ${d.method}`}
                        </p>
                      </div>
                      <span className="text-[14px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.ink }}>+৳{d.amount?.toLocaleString() || 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member Cards */}
      {loading ? (
        <div className="text-center py-12" style={{ color: C.sub }}>লোড হচ্ছে...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-sm border" style={{ background: C.paper, borderColor: C.border, color: C.sub }}>কোনো সদস্য পাওয়া যাচ্ছে না</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-sm border p-5" style={{ background: C.paper, borderColor: C.border }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[14.5px] font-medium" style={{ color: C.text }}>{m.name}</p>
                  {m.phone && <p className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: C.sub }}><Phone size={12} /> {m.phone}</p>}
                  {m.address && <p className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: C.sub }}><MapPin size={12} /> {m.address}</p>}
                  <p className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: C.sub }}><Calendar size={12} /> যোগদান: {new Date(m.join_date).toLocaleDateString("bn-BD", { month: "short", year: "numeric" })}</p>
                </div>
                <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium" style={{ background: m.status === "active" ? C.ink + "1A" : C.red + "1A", color: m.status === "active" ? C.ink : C.red }}>
                  {m.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-4">
                  <span className="text-[11.5px]" style={{ color: C.label }}>মোট দান</span>
                  <span className="text-[15px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.ink }}>৳{m.total_donation?.toLocaleString() || 0}</span>
                  {(m.monthly_pledge ?? 0) > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: C.gold + "1A", color: C.ink }}>মাসে ৳{Number(m.monthly_pledge).toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openHistory(m)} className="p-1.5 rounded-sm hover:brightness-95" style={{ background: C.gold + "1A" }}><History size={13} style={{ color: C.ink }} /></button>
                  <div>
                    <button onClick={() => { setEditingId(m.id); setFormName(m.name); setFormPhone(m.phone || ""); setFormAddress(m.address || ""); setFormStatus(m.status); setFormPledge(String(m.monthly_pledge ?? 0)); setShowForm(true); }} className="p-1 rounded-sm hover:brightness-95" style={{ background: C.ink + "14" }}><Edit2 size={13} style={{ color: C.ink }} /></button>
                    {role === "admin" && <button onClick={() => handleDelete(m.id)} className="p-1 rounded-sm hover:brightness-95 ml-1" style={{ background: C.red + "14" }}><Trash2 size={13} style={{ color: C.red }} /></button>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
