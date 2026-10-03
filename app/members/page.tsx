"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { todayISO, currentMonthStr, toBengaliNumber } from "@/lib/utils";
import Modal from "@/components/Modal";
import { 
  Users, UserPlus, Search, Filter, 
  Phone, MapPin, ChevronRight, MoreHorizontal,
  Shield, CheckCircle, XCircle, Trash2, Edit2,
  Plus, X, Save, Calendar
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { resolvePledgeForMonth, type PledgeHistoryEntry } from "@/lib/payment-ledger";
import { useAuth } from "@/components/providers";
import { isAdmin as hasAdminRole, isStaff as hasStaffRole } from "@/lib/auth";

export default function MembersPage() {
  const { role } = useAuth();
  const isAdmin = hasAdminRole(role);
  const isStaff = hasStaffRole(role);
  
  const [members, setMembers] = useState<any[]>([]);
  const [memberTotals, setMemberTotals] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<"id" | "name" | "total">("id");
  const [pledgeHistory, setPledgeHistory] = useState<PledgeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    member_code: "",
    phone: "",
    address: "",
    join_date: todayISO(),
    status: "active",
    monthly_pledge: "0",
    pledge_effective_month: currentMonthStr(),
    pledge_note: ""
  });

  useEffect(() => {
    fetchMembers();
  }, [isStaff]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const query = isStaff
        ? supabase().from("members").select("*")
        : supabase().from("member_directory").select("*");
      const [{ data }, { data: history, error: historyError }, { data: allocations }] = await Promise.all([
        query.order("name"),
        supabase().from("member_pledge_history").select("member_id, monthly_amount, effective_from_month").order("effective_from_month", { ascending: true }),
        supabase().from("payment_allocations").select("member_id, amount"),
      ]);
      // History decides the "মাসিক অঙ্গীকার" label (BUG-031); a denied read
      // must not break the list — it just falls back to members.monthly_pledge.
      if (historyError) console.warn("Pledge history unavailable:", historyError.message);
      setPledgeHistory((history || []) as PledgeHistoryEntry[]);
      // Member lifetime totals from canonical payment_allocations
      const totals: Record<string, number> = {};
      for (const a of (allocations || []) as Array<{ member_id: string; amount: number | string }>) {
        totals[a.member_id] = (totals[a.member_id] || 0) + Number(a.amount || 0);
      }
      setMemberTotals(totals);
      setMembers(data || []);

    } catch (err) {
      console.error("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  };

  // What the engine will actually charge THIS month — members.monthly_pledge
  // is only the fallback for months with no history row, so a member can sit
  // on ৳১০০ in the table while the ledger charges ৳১,০০০ (BUG-031).
  const effectivePledgeOf = (member: any) =>
    resolvePledgeForMonth(currentMonthStr(), Number(member.monthly_pledge) || 0, pledgeHistory.filter((h) => h.member_id === member.id));

  const handleOpenModal = (member: any = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        member_code: member.member_code || "",
        phone: member.phone || "",
        address: member.address || "",
        join_date: member.join_date,
        status: member.status,
        monthly_pledge: (member.monthly_pledge || 0).toString(),
        pledge_effective_month: currentMonthStr(),
        pledge_note: ""
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: "",
        member_code: "",
        phone: "",
        address: "",
        join_date: todayISO(),
        status: "active",
        monthly_pledge: "0",
        pledge_effective_month: currentMonthStr(),
        pledge_note: ""
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

    // parseFloat("") === NaN, which JSON-serialises to null: a cleared pledge
    // box used to write NULL into members.monthly_pledge (read as 0
    // everywhere downstream) with no history row and no visible error.
    const pledgeInput = formData.monthly_pledge.trim() === "" ? "0" : formData.monthly_pledge;
    const monthlyPledge = parseFloat(pledgeInput);
    if (!Number.isFinite(monthlyPledge) || monthlyPledge < 0) {
      alert("মাসিক অঙ্গীকার শূন্য বা তার বেশি একটি সংখ্যা হতে হবে।");
      return;
    }
    const previousPledge = Number(editingMember?.monthly_pledge ?? NaN);
    const pledgeChanged = !editingMember || previousPledge !== monthlyPledge;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        member_code: formData.member_code.trim() || null,
        phone: formData.phone,
        address: formData.address,
        join_date: formData.join_date,
        status: formData.status,
        monthly_pledge: monthlyPledge
      };

      let savedMemberId = editingMember?.id;
      if (editingMember) {
        const { error } = await supabase()
          .from("members")
          .update(payload)
          .eq("id", editingMember.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase()
          .from("members")
          .insert([payload])
          .select("id")
          .single();
        if (error) throw error;
        savedMemberId = data.id;
      }

      // Only write a pledge-history row when the pledge actually changed:
      // every submit used to insert one (address/phone edits included), which
      // inflated the audit page's change counter with phantom entries.
      if (isStaff && savedMemberId && pledgeChanged) {
        const { error: historyError } = await supabase().from("member_pledge_history").insert([{
          member_id: savedMemberId,
          monthly_amount: payload.monthly_pledge,
          effective_from_month: formData.pledge_effective_month,
          note: formData.pledge_note || null
        }]);
        if (historyError) throw historyError;
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
  ).sort((a, b) => {
    if (sortBy === "total") return (memberTotals[b.id] || 0) - (memberTotals[a.id] || 0);
    if (sortBy === "id") {
      const aId = Number(a.member_code) || Number.MAX_SAFE_INTEGER;
      const bId = Number(b.member_code) || Number.MAX_SAFE_INTEGER;
      return aId - bId;
    }
    return a.name.localeCompare(b.name, "bn");
  });

  if (loading) return (
    <div className="p-4 sm:p-8 space-y-8" aria-hidden="true">
      <div className="h-10 w-56 bg-gray-100 rounded-xl animate-pulse" />
      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-white/50"><div className="h-10 max-w-md bg-gray-100 rounded-xl animate-pulse" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6 bg-gray-50/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-emerald-50/50 space-y-3">
              <div className="flex items-start justify-between"><div className="w-14 h-14 rounded-2xl bg-gray-100 animate-pulse" /><div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" /></div>
              <div className="h-5 bg-gray-100 rounded-lg w-2/3 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded-lg w-full animate-pulse" />
              <div className="h-3 bg-gray-100 rounded-lg w-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 space-y-8 touch-spacing">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-shadhinata text-gray-900 mb-1">সদস্য তালিকা</h1>
          <p className="text-sm text-gray-500 font-medium">ফাউন্ডেশনের সকল নিবন্ধিত সদস্য</p>
        </div>
        {isStaff && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 btn-emerald h-12 px-6"
          >
            <Plus size={20} />
            <span>নতুন সদস্য</span>
          </button>
        )}
      </div>

      <div className="card-premium overflow-hidden border border-emerald-50 shadow-sm">
        <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="সদস্যের নাম বা ফোন খুঁজুন..." 
              aria-label="সদস্যের নাম বা ফোন খুঁজুন"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all" 
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs font-bold text-gray-500">সাজান:</span>
            <button
              onClick={() => setSortBy("id")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${sortBy === "id" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              আইডি
            </button>
            <button
              onClick={() => setSortBy("name")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${sortBy === "name" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              নাম
            </button>
            <button
              onClick={() => setSortBy("total")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${sortBy === "total" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              মোট অনুযায়ী
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6 bg-gray-50/50">
          {filteredMembers.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl border border-dashed border-gray-200 py-16 text-center">
              <Search className="mx-auto text-gray-300" size={36} />
              <p className="mt-3 font-bold text-gray-800">কোনো সদস্য পাওয়া যায়নি</p>
              <p className="text-sm text-gray-500 mt-1">সার্চ বদলে আবার দেখুন অথবা নতুন সদস্য যোগ করুন</p>
            </div>
          ) : filteredMembers.map((member) => (
            <div key={member.id} className="bg-white p-6 rounded-3xl border border-emerald-50/50 hover:shadow-xl hover:shadow-emerald-100/20 transition-all group relative">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-100 group-hover:scale-105 transition-transform">
                  {member.name[0]}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </div>
                  {isStaff && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenModal(member)}
                        className="p-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                        title="এডিট"
                        aria-label="এডিট"
                      >
                        <Edit2 size={16} />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(member.id)}
                          className="p-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                          title="ডিলিট"
                          aria-label="ডিলিট"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button 
                        onClick={async () => {
                          try {
                            const r = await fetch(`/api/members/${member.id}/qr`);
                            const res = await r.json().catch(() => ({}));
                            if (!r.ok || !res.qrImage) {
                              alert("কিউআর কোড তৈরি করা যায়নি: " + (res.error || `HTTP ${r.status}`));
                              return;
                            }
                            const link = document.createElement("a");
                            link.href = res.qrImage;
                            link.download = `QR_${member.name}.png`;
                            link.click();
                          } catch (err) {
                            alert("কিউআর কোড তৈরি করা যায়নি");
                          }
                        }}
                        className="p-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all active:scale-90"
                        title="কিউআর কোড"
                        aria-label="কিউআর কোড"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                      </button>
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="p-3 min-h-[44px] min-w-[44px] text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all active:scale-90 inline-flex items-center justify-center"
                        title="বিস্তারিত দেখুন"
                        aria-label="বিস্তারিত দেখুন"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors font-shadhinata">
                {member.member_code && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mr-2">
                    #{member.member_code}
                  </span>
                )}
                {member.name}
              </h3>
              <p className="text-[11px] text-gray-500 font-bold mb-1">{member.role || 'সদস্য'}</p>
              <p className="text-sm font-bold text-emerald-700 mb-4">
                মোট দিয়েছেন: ৳{(memberTotals[member.id] || 0).toLocaleString("bn-BD")}
              </p>
              
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                    <Phone size={14} />
                  </div>
                  {isStaff ? (member.phone ? toBengaliNumber(member.phone) : 'ফোন নেই') : 'পাবলিক নয়'}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                    <MapPin size={14} />
                  </div>
                  <span className="line-clamp-1">{isStaff ? (member.address || 'ঠিকানা নেই') : 'পাবলিক নয়'}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <span className="text-[10px] text-gray-500 font-bold">মাসিক অঙ্গীকার</span>
                  <span className="text-base font-bold text-emerald-700 font-baloo">৳{effectivePledgeOf(member).toLocaleString("bn-BD")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} label={editingMember ? 'সদস্য এডিট করুন' : 'নতুন সদস্য যোগ করুন'}>
            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-emerald-600 text-white">
              <div>
                <h2 className="text-xl font-bold font-shadhinata">{editingMember ? 'সদস্য এডিট করুন' : 'নতুন সদস্য যোগ করুন'}</h2>
                <p className="text-emerald-100 text-xs mt-1">সঠিক তথ্য প্রদান করে সেভ করুন</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors" aria-label="বন্ধ">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label htmlFor="member-name" className="text-[13px] font-bold text-gray-700 ml-1">সদস্যের নাম *</label>
                <input id="member-name"
                   
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="পুরো নাম লিখুন"
                  required
                />
              </div>

              <div>
                <label htmlFor="member-code" className="text-[13px] font-bold text-gray-700 ml-1">সদস্য আইডি</label>
                <input id="member-code"
                  type="text"
                  value={formData.member_code}
                  onChange={(e) => setFormData({...formData, member_code: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="যেমন: 1, 2, 45"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="member-phone" className="text-[13px] font-bold text-gray-700 ml-1">ফোন নম্বর</label>
                  <input id="member-phone"
                   
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    placeholder="017XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="member-join-date" className="text-[13px] font-bold text-gray-700 ml-1">যোগদানের তারিখ *</label>
                  <input id="member-join-date"
                   
                    type="date"
                    value={formData.join_date}
                    onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="member-address" className="text-[13px] font-bold text-gray-700 ml-1">ঠিকানা</label>
                <input id="member-address"
                   
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="গ্রাম, ডাকঘর, উপজেলা"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="member-pledge" className="text-[13px] font-bold text-gray-700 ml-1">মাসিক অঙ্গীকার (৳)</label>
                  <input id="member-pledge"
                   
                    type="number"
                    inputMode="numeric"
                    value={formData.monthly_pledge}
                    onChange={(e) => setFormData({...formData, monthly_pledge: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="member-pledge-month" className="text-[13px] font-bold text-gray-700 ml-1">কার্যকর মাস</label>
                  <input id="member-pledge-month"
                  
                    type="month"
                    value={formData.pledge_effective_month}
                    onChange={(e) => setFormData({...formData, pledge_effective_month: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="member-status" className="text-[13px] font-bold text-gray-700 ml-1">স্ট্যাটাস</label>
                  <select id="member-status"
                   
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    <option value="active">সক্রিয়</option>
                    <option value="inactive">নিষ্ক্রিয়</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="member-pledge-note" className="text-[13px] font-bold text-gray-700 ml-1">অঙ্গীকার পরিবর্তনের নোট</label>
                <input id="member-pledge-note"
                  
                  type="text"
                  value={formData.pledge_note}
                  onChange={(e) => setFormData({...formData, pledge_note: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="যেমন: নতুন মাসিক অঙ্গীকার"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-outline flex-1"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="btn-emerald flex-1 disabled:opacity-50"
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
      </Modal>
    </div>
  );
}
