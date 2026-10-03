"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";
import {
  buildMemberLedgerFromAllocations,
  type LedgerMonth,
  type PledgeHistoryEntry,
} from "@/lib/payment-ledger";
import {
  toBengaliNumber,
  monthLabelBengali,
  currentMonthStr,
  formatMoney,
} from "@/lib/utils";
import Modal from "@/components/Modal";
import {
  User, Phone, MapPin, Calendar, ReceiptText, Bell,
  CheckCircle2, AlertCircle, Clock, Wallet, TrendingUp,
  ChevronRight, Edit2, X,
} from "lucide-react";

const STATUS_META: Record<LedgerMonth["status"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  paid: { label: "পরিশোধিত", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  partial: { label: "আংশিক", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock },
  due: { label: "বকেয়া", cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: AlertCircle },
  overpaid: { label: "অতিরিক্ত", cls: "bg-sky-50 text-sky-700 border-sky-200", Icon: TrendingUp },
};

const METHOD_LABEL: Record<string, string> = {
  cash: "নগদ",
  bkash: "বিকাশ",
  nagad: "নগদ",
  bank: "ব্যাংক",
};

export default function AmarHisabPage() {
  const { user, memberId, role } = useAuth();
  const [member, setMember] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [pledgeHistory, setPledgeHistory] = useState<PledgeHistoryEntry[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      return;
    }
    const fetchAll = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [mRes, dRes, aRes, hRes, nRes] = await Promise.all([
          supabase().from("members").select("*").eq("id", memberId).single(),
          supabase().from("donations").select("*").eq("member_id", memberId).order("date", { ascending: false }),
          supabase().from("payment_allocations").select("payment_id, member_id, month, amount, allocation_type").eq("member_id", memberId),
          supabase().from("member_pledge_history").select("member_id, monthly_amount, effective_from_month").eq("member_id", memberId).order("effective_from_month", { ascending: true }),
          supabase().from("notices").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(5),
        ]);
        if (mRes.error) throw mRes.error;
        // Allocation + pledge-history reads need the F1 RLS policies; if the
        // migration isn't applied yet they fail closed — the ledger falls back
        // to computing from donations alone instead of breaking the page.
        if (aRes.error) console.warn("Allocations unavailable:", aRes.error.message);
        if (hRes.error) console.warn("Pledge history unavailable:", hRes.error.message);
        if (dRes.error) throw dRes.error;
        setMember(mRes.data);
        setDonations(dRes.data || []);
        setAllocations(aRes.data || []);
        setPledgeHistory((hRes.data || []) as PledgeHistoryEntry[]);
        setNotices(nRes.data || []);
        if (mRes.data) {
          setEditForm({
            name: mRes.data.name || "",
            phone: mRes.data.phone || "",
            address: mRes.data.address || "",
          });
        }
      } catch (err) {
        console.error("AmarHisab load failed:", err);
        setLoadError(err instanceof Error ? err.message : "তথ্য লোড করা যায়নি");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [memberId]);

  const ledger = useMemo<LedgerMonth[]>(() => {
    if (!member) return [];
    const startMonth = String(member.join_date || `${currentMonthStr()}-01`).slice(0, 7);
    // Extend to future months with advance payments
    let endMonth = currentMonthStr();
    for (const a of allocations) {
      const m = (a as any).month;
      if (m && m > endMonth) endMonth = m;
    }
    return buildMemberLedgerFromAllocations(
      allocations,
      donations,
      Number(member.monthly_pledge) || 0,
      startMonth,
      endMonth,
      pledgeHistory,
    );
  }, [member, donations, allocations, pledgeHistory]);

  const summary = useMemo(() => {
    const expected = ledger.reduce((a, m) => a + m.expected, 0);
    const paidPledge = ledger.reduce((a, m) => a + Math.min(m.paid, m.expected), 0);
    const extra = ledger.reduce((a, m) => a + m.unallocated + Math.max(0, m.paid - m.expected), 0);
    const arrears = ledger.reduce((a, m) => a + m.remaining, 0);
    const paidMonths = ledger.filter((m) => m.status === "paid" || m.status === "overpaid").length;
    return {
      expected,
      totalPaid: paidPledge + extra,
      arrears,
      rate: expected > 0 ? Math.round((paidPledge / expected) * 100) : 100,
      paidMonths,
      totalMonths: ledger.length,
    };
  }, [ledger]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      alert("নাম অবশ্যই দিতে হবে।");
      return;
    }
    if (editForm.phone && !/^\d{11}$/.test(editForm.phone)) {
      alert("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।");
      return;
    }
    setSubmitting(true);
    try {
      // Only name/phone/address are writable here — the DB trigger
      // (enforce_member_self_update) rejects pledge/status changes with 42501.
      const { error: memberError } = await supabase()
        .from("members")
        .update({ name: editForm.name.trim(), phone: editForm.phone, address: editForm.address })
        .eq("id", memberId);
      if (memberError) throw memberError;
      const { error: userError } = await supabase()
        .from("users")
        .update({ name: editForm.name.trim(), phone: editForm.phone })
        .eq("id", user?.id);
      if (userError) console.warn("User row not updated:", userError.message);
      setMember({ ...member, ...editForm });
      setIsEditing(false);
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("আপডেট করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center" role="status" aria-label="লোড হচ্ছে">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-rose-600 font-bold">তথ্য লোড করা যায়নি: {loadError}</p>
        <button onClick={() => window.location.reload()} className="btn-emerald min-h-[44px] px-6">আবার চেষ্টা করুন</button>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center px-4">
        <div className="card-premium p-10">
          <User size={48} className="mx-auto mb-6 text-gray-200" aria-hidden="true" />
          <h1 className="text-xl font-bold font-shadhinata text-gray-900 mb-3">সদস্য তথ্য পাওয়া যায়নি</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {role === "member"
              ? "আপনার অ্যাকাউন্টের সাথে কোনো সদস্য প্রোফাইল যুক্ত নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।"
              : "এই পেজটি সদস্যদের নিজস্ব হিসাব দেখার জন্য। আপনার অ্যাকাউন্টের সাথে কোনো সদস্য প্রোফাইল যুক্ত নেই।"}
          </p>
        </div>
      </div>
    );
  }

  const ledgerNewestFirst = [...ledger].reverse();

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="card-premium p-6 sm:p-8 bg-[#064E3B] text-white relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-2xl font-bold shrink-0" aria-hidden="true">
              {member.name?.[0] || "স"}
            </div>
            <div>
              <p className="text-xs text-white/60 font-bold mb-1">আমার হিসাব</p>
              <h1 className="text-2xl font-bold font-shadhinata">{member.name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-white/70 text-sm">
                {member.phone && <span className="inline-flex items-center gap-1.5"><Phone size={13} aria-hidden="true" /> {toBengaliNumber(member.phone)}</span>}
                <span className="inline-flex items-center gap-1.5"><Calendar size={13} aria-hidden="true" /> {toBengaliNumber(String(member.join_date || "").slice(0, 10))} থেকে সদস্য</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="min-h-[44px] min-w-[44px] p-3 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-sm font-bold transition-all shrink-0"
            aria-label="প্রোফাইল সম্পাদনা"
          >
            <Edit2 size={16} aria-hidden="true" />
            <span className="hidden sm:inline">সম্পাদনা</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="region" aria-label="হিসাবের সারাংশ">
        <div className="card-premium p-4 sm:p-5">
          <p className="text-xs text-gray-500 font-bold mb-1">মাসিক প্রতিশ্রুতি</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 font-baloo">{formatMoney(Number(member.monthly_pledge) || 0)}</p>
        </div>
        <div className="card-premium p-4 sm:p-5">
          <p className="text-xs text-gray-500 font-bold mb-1">মোট জমা</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 font-baloo">{formatMoney(summary.totalPaid)}</p>
        </div>
        <div className="card-premium p-4 sm:p-5">
          <p className="text-xs text-gray-500 font-bold mb-1">মোট বকেয়া</p>
          <p className={`text-xl sm:text-2xl font-bold font-baloo ${summary.arrears > 0 ? "text-rose-600" : "text-gray-900"}`}>{formatMoney(summary.arrears)}</p>
        </div>
        <div className="card-premium p-4 sm:p-5">
          <p className="text-xs text-gray-500 font-bold mb-1">পরিশোধের হার</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 font-baloo">{toBengaliNumber(summary.rate)}%</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{toBengaliNumber(summary.paidMonths)}/{toBengaliNumber(summary.totalMonths)} মাস</p>
        </div>
      </div>

      {/* Monthly ledger */}
      <section className="card-premium p-4 sm:p-6" aria-labelledby="ledger-heading">
        <h2 id="ledger-heading" className="text-lg font-bold font-shadhinata text-gray-900 mb-4 flex items-center gap-2">
          <Wallet size={18} className="text-emerald-600" aria-hidden="true" /> মাসিক হিসাব
        </h2>
        {ledgerNewestFirst.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">এখনো কোনো মাসের হিসাব তৈরি হয়নি।</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {ledgerNewestFirst.map((m) => {
              const meta = STATUS_META[m.status];
              return (
                <li key={m.month} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-[15px]">{monthLabelBengali(m.month)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      প্রত্যাশিত {formatMoney(m.expected)}
                      {m.paid > 0 && <> · জমা {formatMoney(m.paid)}</>}
                      {m.remaining > 0 && <span className="text-rose-600 font-bold"> · বাকি {formatMoney(m.remaining)}</span>}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-full border text-xs font-bold ${meta.cls}`}>
                    <meta.Icon size={13} aria-hidden="true" /> {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Payment history */}
      <section className="card-premium p-4 sm:p-6" aria-labelledby="payments-heading">
        <h2 id="payments-heading" className="text-lg font-bold font-shadhinata text-gray-900 mb-4 flex items-center gap-2">
          <ReceiptText size={18} className="text-emerald-600" aria-hidden="true" /> জমার ইতিহাস
        </h2>
        {donations.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">এখনো কোনো জমা হয়নি।</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {donations.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/donations/${d.id}/receipt`}
                  className="py-3 flex items-center justify-between gap-3 min-h-[56px] rounded-xl px-2 -mx-2 hover:bg-emerald-50/50 active:bg-emerald-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-[15px] font-baloo">{formatMoney(Number(d.amount) || 0)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {toBengaliNumber(String(d.date || "").slice(0, 10))} · {METHOD_LABEL[String(d.method)] || d.method} · রসিদ {d.receipt_no}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Notices */}
      {notices.length > 0 && (
        <section className="card-premium p-4 sm:p-6" aria-labelledby="notices-heading">
          <h2 id="notices-heading" className="text-lg font-bold font-shadhinata text-gray-900 mb-4 flex items-center gap-2">
            <Bell size={18} className="text-emerald-600" aria-hidden="true" /> নোটিশ
          </h2>
          <ul className="space-y-3">
            {notices.map((n) => (
              <li key={n.id} className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl">
                <p className="font-bold text-gray-900 text-sm">{n.title}</p>
                {n.body && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{n.body}</p>}
                <p className="text-[11px] text-gray-400 mt-1.5">{toBengaliNumber(String(n.created_at || "").slice(0, 10))}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Profile edit modal */}
      <Modal open={isEditing} onClose={() => setIsEditing(false)} label="প্রোফাইল সম্পাদনা">
        <h2 className="text-lg font-bold font-shadhinata text-gray-900 mb-4">প্রোফাইল সম্পাদনা</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label htmlFor="ah-name" className="block text-sm font-bold text-gray-700 mb-1.5">নাম</label>
            <input
              id="ah-name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="input-premium w-full min-h-[44px]"
              required
            />
          </div>
          <div>
            <label htmlFor="ah-phone" className="block text-sm font-bold text-gray-700 mb-1.5">মোবাইল</label>
            <input
              id="ah-phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="input-premium w-full min-h-[44px]"
              inputMode="numeric"
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div>
            <label htmlFor="ah-address" className="block text-sm font-bold text-gray-700 mb-1.5">ঠিকানা</label>
            <textarea
              id="ah-address"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="input-premium w-full min-h-[88px]"
              rows={3}
            />
          </div>
          <p className="text-xs text-gray-400">মাসিক প্রতিশ্রুতি ও স্ট্যাটাস শুধু অ্যাডমিন পরিবর্তন করতে পারবেন।</p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setIsEditing(false)} className="btn-outline flex-1 min-h-[44px]">
              <X size={16} aria-hidden="true" /> বাতিল
            </button>
            <button type="submit" disabled={submitting} className="btn-emerald flex-1 min-h-[44px] disabled:opacity-50">
              {submitting ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
