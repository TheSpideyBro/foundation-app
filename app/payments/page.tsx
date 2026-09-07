"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Banknote, Calendar, CheckCircle2,
  Loader2, ReceiptText, User, Wallet, AlertCircle,
  Plus, Minus, Info, ChevronDown, ChevronUp, Pencil, X,
  FileCheck, ShieldCheck, TrendingDown, TrendingUp,
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import {
  calculatePaymentAllocation,
  pledgeBreakdown,
  formatMonth,
  monthRange,
  type PledgeHistoryEntry,
  type AllocationResult,
} from "@/lib/payment-ledger";
import { useAuth } from "@/components/providers";

// ─── Types ───────────────────────────────────────────────────────────────────

type MemberOption = {
  id: string;
  name: string;
  phone?: string;
  monthly_pledge?: number | string;
  status?: string;
};

type PledgeHistoryItem = PledgeHistoryEntry & { name?: string };

type CoverageMode = "single" | "range";

type JomaForm = {
  memberId: string;
  paymentAmount: string;
  paymentDate: string;
  paymentMethod: string;
  receiptNo: string;
  collectedBy: string;
  note: string;
  coverageMode: CoverageMode;
  coverageStartMonth: string;
  coverageEndMonth: string;
  pledgeChangeEnabled: boolean;
  newPledgeAmount: string;
  pledgeEffectiveMonth: string;
  pledgeChangeNote: string;
  customAllocationEnabled: boolean;
  customAllocations: Array<{ month: string; amount: string }>;
};

type AllocationRow = {
  month: string;
  expected: number;
  allocated: number;
  allocationType: "pledge" | "advance" | "unallocated";
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const money = (v: number) => `৳${Math.round(v || 0).toLocaleString("bn-BD")}`;
const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

function generateReceiptNo(): string {
  return `R-${Math.floor(100000 + Math.random() * 900000)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JomaEntryPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const isAdminEmail = user?.email === "saddamakash234@gmail.com";
  const isStaff = role === "admin" || role === "treasurer" || isAdminEmail;

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [pledgeHistory, setPledgeHistory] = useState<PledgeHistoryItem[]>([]);
  const [treasurers, setTreasurers] = useState<Array<{ id: string; name: string; phone?: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const today = todayStr();
  const curMonth = currentMonth();
  const [form, setForm] = useState<JomaForm>({
    memberId: "",
    paymentAmount: "",
    paymentDate: today,
    paymentMethod: "cash",
    receiptNo: generateReceiptNo(),
    collectedBy: "",
    note: "",
    coverageMode: "single",
    coverageStartMonth: curMonth,
    coverageEndMonth: curMonth,
    pledgeChangeEnabled: false,
    newPledgeAmount: "",
    pledgeEffectiveMonth: curMonth,
    pledgeChangeNote: "",
    customAllocationEnabled: false,
    customAllocations: [],
  });

  // UI state
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ id: string; receipt: string; amount: number } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Filtered members for search
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q),
    );
  }, [members, memberSearch]);

  // Selected member data
  const selectedMember = useMemo(
    () => members.find((m) => m.id === form.memberId),
    [members, form.memberId],
  );

  const memberPledgeHistory = useMemo(
    () => pledgeHistory.filter((h) => h.member_id === form.memberId).sort((a, b) => a.effective_from_month.localeCompare(b.effective_from_month)),
    [pledgeHistory, form.memberId],
  );

  // Load data
  useEffect(() => {
    async function load() {
      if (!isStaff) { setLoading(false); return; }
      try {
        const [{ data: membersData, error: mErr }, { data: pledgeData, error: pErr }, { data: userData, error: uErr }] =
          await Promise.all([
            supabase().from("members").select("id, name, phone, monthly_pledge, status").order("name"),
            supabase().from("member_pledge_history").select("member_id, monthly_amount, effective_from_month, note, created_at, members(name)").order("effective_from_month", { ascending: true }),
            supabase().from("users").select("id, name, phone, role").in("role", ["admin", "treasurer"]),
          ]);
        if (mErr) throw mErr;
        setMembers((membersData || []) as MemberOption[]);
        setPledgeHistory((pledgeData || []).map((e: any) => ({
          member_id: e.member_id,
          monthly_amount: e.monthly_amount,
          effective_from_month: e.effective_from_month,
          note: e.note,
          name: (e.members as any)?.name || undefined,
        })) as PledgeHistoryItem[]);
        setTreasurers((userData || []).map((u: any) => ({
          id: u.id,
          name: u.name || "Unknown",
          phone: u.phone || "",
        })));
        // Auto-select current user as collector if possible
        if (user?.id) {
          setForm((f) => ({ ...f, collectedBy: user.id }));
        }
      } catch (e: any) {
        console.error("Joma load error:", e);
        setError(e.message || "লোড করতে সমস্যা হয়েছে");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isStaff, user]);

  // Live allocation preview
  const allocationPreview = useMemo<AllocationResult>(() => {
    if (!form.memberId || !form.paymentAmount) return { allocations: [], allocatedAmount: 0, unallocatedAmount: 0 };
    const amount = parseFloat(form.paymentAmount);
    if (isNaN(amount) || amount <= 0) return { allocations: [], allocatedAmount: 0, unallocatedAmount: 0 };
    const endMonth = form.coverageMode === "range" ? form.coverageEndMonth : form.coverageStartMonth;
    return calculatePaymentAllocation(
      amount,
      form.coverageStartMonth,
      endMonth,
      selectedMember?.monthly_pledge ?? 0,
      memberPledgeHistory,
    );
  }, [form.memberId, form.paymentAmount, form.coverageStartMonth, form.coverageEndMonth, form.coverageMode, selectedMember, memberPledgeHistory]);

  // Allocation rows for preview table
  const allocationRows = useMemo<AllocationRow[]>(() => {
    if (!form.memberId || !form.paymentAmount) return [];
    const amount = parseFloat(form.paymentAmount);
    if (isNaN(amount) || amount <= 0) return [];
    const endMonth = form.coverageMode === "range" ? form.coverageEndMonth : form.coverageStartMonth;
    const months = monthRange(form.coverageStartMonth, endMonth);
    const breakdown = pledgeBreakdown(
      form.coverageStartMonth,
      endMonth,
      selectedMember?.monthly_pledge ?? 0,
      memberPledgeHistory,
    );
    const byMonth = new Map(breakdown.map((b) => [b.month, b.expected]));

    return months.map((month) => {
      const expected = byMonth.get(month) || 0;
      const alloc = allocationPreview.allocations.find((a) => a.month === month);
      return {
        month,
        expected,
        allocated: alloc?.amount || 0,
        allocationType: alloc?.allocationType || "pledge",
      };
    });
  }, [form.memberId, form.paymentAmount, form.coverageStartMonth, form.coverageEndMonth, form.coverageMode, allocationPreview, selectedMember, memberPledgeHistory]);

  function set(field: keyof JomaForm, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateCustomAllocation(index: number, field: "month" | "amount", value: string) {
    setForm((f) => {
      const updates = [...f.customAllocations];
      updates[index] = { ...updates[index], [field]: value };
      return { ...f, customAllocations: updates };
    });
  }

  function addCustomAllocation() {
    setForm((f) => ({
      ...f,
      customAllocations: [...f.customAllocations, { month: form.coverageStartMonth, amount: "" }],
    }));
  }

  function removeCustomAllocation(index: number) {
    setForm((f) => ({
      ...f,
      customAllocations: f.customAllocations.filter((_, i) => i !== index),
    }));
  }

  function quickAmountMultiplier(multiplier: number) {
    const pledge = selectedMember ? Number(selectedMember.monthly_pledge) || 0 : 0;
    set("paymentAmount", String(pledge * multiplier));
  }

  // ─── Confirmation dialog ────────────────────────────────────────────────────

  function openConfirm() {
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);
    setSubmitting(true);
    setError(null);

    try {
      const amount = parseFloat(form.paymentAmount);
      const endMonth = form.coverageMode === "range" ? form.coverageEndMonth : form.coverageStartMonth;

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: form.memberId,
          amount,
          date: form.paymentDate,
          method: form.paymentMethod,
          receipt_no: form.receiptNo,
          coverage_start_month: form.coverageStartMonth,
          coverage_end_month: endMonth,
          collected_by: form.collectedBy,
          note: form.note || null,
          pledge_change_amount: form.pledgeChangeEnabled ? (parseFloat(form.newPledgeAmount) || null) : null,
          pledge_effective_month: form.pledgeChangeEnabled ? form.pledgeEffectiveMonth || null : null,
          pledge_change_note: form.pledgeChangeNote || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "সেভ করতে সমস্যা হয়েছে");

      setSuccessData({
        id: data.payment_id,
        receipt: form.receiptNo,
        amount,
      });
      // Reset form
      setForm({
        memberId: "",
        paymentAmount: "",
        paymentDate: today,
        paymentMethod: "cash",
        receiptNo: generateReceiptNo(),
        collectedBy: form.collectedBy,
        note: "",
        coverageMode: "single",
        coverageStartMonth: curMonth,
        coverageEndMonth: curMonth,
        pledgeChangeEnabled: false,
        newPledgeAmount: "",
        pledgeEffectiveMonth: curMonth,
        pledgeChangeNote: "",
        customAllocationEnabled: false,
        customAllocations: [],
      });
    } catch (e: any) {
      setError(e.message || "সেভ করতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    router.push("/donations");
  }

  // ─── Loading / role gate ───────────────────────────────────────────────────

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center p-8">
          <ShieldCheck className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 font-tiro mb-2">প্রবেশাধিকার সংরক্ষিত</h1>
          <p className="text-gray-500">এই পেজটি শুধুমাত্র স্টাফ সদস্যদের জন্য।</p>
          <button onClick={handleCancel} className="mt-6 btn-emerald">ড্যাশবোর্ডে যান</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-gray-500 font-bold">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // ─── Success state ──────────────────────────────────────────────────────────

  if (successData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-8">
        <div className="max-w-2xl mx-auto px-4 pt-8">
          <button onClick={handleCancel} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold mb-6">
            <ArrowLeft size={18} /> ফিরে যান
          </button>
          <div className="card-premium p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold font-tiro text-gray-900 mb-2">জমা এন্ট্রি সফলভাবে সংরক্ষিত হয়েছে</h1>
            <p className="text-gray-500 mb-6">জমার তথ্য নিচে দেওয়া হলো</p>

            <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-bold mb-1">রসিদ নং</p>
                <p className="font-bold text-gray-900">{successData.receipt}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-bold mb-1">পরিমাণ</p>
                <p className="font-bold text-emerald-600">{money(successData.amount)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                <p className="text-xs text-gray-400 font-bold mb-1">বরাদ্দ</p>
                <p className="font-bold text-gray-900">৳{allocationPreview.allocatedAmount.toLocaleString("bn-BD")} বরাদ্দ • ৳{allocationPreview.unallocatedAmount.toLocaleString("bn-BD")} অবণ্টিত</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8 justify-center">
              <button onClick={handleCancel} className="btn-emerald">
                <Plus size={17} /> নতুন জমা
              </button>
              <button
                onClick={() => router.push(`/donations`)}
                className="btn-outline"
              >
                <FileCheck size={17} /> জমা তালিকা
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Confirm dialog ─────────────────────────────────────────────────────────

  function renderConfirmDialog() {
    if (!showConfirm) return null;
    const endMonth = form.coverageMode === "range" ? form.coverageEndMonth : form.coverageStartMonth;
    const months = monthRange(form.coverageStartMonth, endMonth);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="bg-emerald-600 p-6 text-white">
            <h2 className="text-xl font-black font-tiro">জমা এন্ট্রি নিশ্চিত করুন</h2>
            <p className="text-emerald-100 text-sm mt-1">বরাদ্দ তথ্য পরীক্ষা করুন</p>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Member */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <User className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-bold">সদস্য</p>
                <p className="font-bold text-gray-900">{selectedMember?.name || "—"}</p>
              </div>
            </div>

            {/* Payment */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Banknote className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-bold">পরিশোধের পরিমাণ</p>
                <p className="font-black text-emerald-600 text-lg">{money(parseFloat(form.paymentAmount) || 0)}</p>
              </div>
            </div>

            {/* Coverage */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-bold">যে মাসের জন্য জমা</p>
                <p className="font-bold text-gray-900">
                  {form.coverageMode === "range"
                    ? `${monthLabel(form.coverageStartMonth)} → ${monthLabel(form.coverageEndMonth)}`
                    : monthLabel(form.coverageStartMonth)}
                </p>
              </div>
            </div>

            {/* Allocation breakdown */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 font-bold mb-3">বরাদ্দ বিবরণ</p>
              <div className="space-y-2">
                {allocationRows.map((row) => (
                  <div key={row.month} className="flex justify-between text-sm">
                    <span className="text-gray-600">{monthLabel(row.month)}</span>
                    <span className="font-bold text-gray-900">{money(row.allocated)}</span>
                  </div>
                ))}
                {allocationPreview.unallocatedAmount > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-amber-600 font-bold">অবণ্টিত / অতিরিক্ত</span>
                    <span className="font-bold text-amber-600">{money(allocationPreview.unallocatedAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-2 border-t-2 border-gray-200">
                  <span>মোট বরাদ্দ</span>
                  <span className="text-emerald-600">{money(allocationPreview.allocatedAmount)}</span>
                </div>
              </div>
            </div>

            {/* Pledge change */}
            {form.pledgeChangeEnabled && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-700 font-bold mb-2">মাসিক অঙ্গীকার পরিবর্তন</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">{selectedMember ? money(Number(selectedMember.monthly_pledge) || 0) : "—"}</span>
                  <TrendingDown className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-emerald-600">{money(parseFloat(form.newPledgeAmount) || 0)}</span>
                  <span className="text-gray-400 text-xs">থেকে {monthLabel(form.pledgeEffectiveMonth)}</span>
                </div>
              </div>
            )}

            {form.note && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 font-bold mb-1">জমার নোট</p>
                <p className="text-sm text-gray-700">{form.note}</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-[2] px-4 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> সংরক্ষণ হচ্ছে...</> : <><CheckCircle2 className="w-4 h-4" /> নিশ্চিত করুন</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main form ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={handleCancel} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold transition-colors">
            <ArrowLeft size={18} /> ফিরে যান
          </button>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-black text-gray-900 font-tiro">জমা এন্ট্রি</h1>
          </div>
          <div className="w-20" /> {/* spacer */}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-sm font-medium flex items-center gap-3 border border-rose-100">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ─── Left: Form ─── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Member & Payment Details */}
            <div className="card-premium p-5 space-y-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" /> সদস্য ও জমার তথ্য
              </h2>

              {/* Member search */}
              <div className="relative">
                <label className="text-xs font-bold text-gray-500 mb-1 block">সদস্য নির্বাচন করুন *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="সদস্যের নাম বা ফোন নম্বর লিখুন..."
                    value={memberSearch}
                    onChange={(e) => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
                    onFocus={() => setShowMemberDropdown(true)}
                    onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
                    className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                {showMemberDropdown && filteredMembers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          set("memberId", m.id);
                          setMemberSearch(m.name);
                          setShowMemberDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.phone || "ফোন নেই"} · {m.status === "inactive" ? "নিষ্ক্রিয়" : "সক্রিয়"}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Member info display */}
              {selectedMember && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-600 font-bold">বর্তমান মাসিক অঙ্গীকার</p>
                      <p className="text-lg font-black text-emerald-700">{money(Number(selectedMember.monthly_pledge) || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-600 font-bold">মাসিক চাঁদা</p>
                      <p className="text-sm font-bold text-gray-700">{monthLabel(curMonth)}</p>
                    </div>
                  </div>
                  {memberPledgeHistory.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-emerald-600 cursor-pointer font-bold">ইতিহাস দেখুন</summary>
                      <div className="mt-2 space-y-1 text-xs">
                        {memberPledgeHistory.map((h, i) => (
                          <div key={i} className="flex justify-between text-gray-600">
                            <span>{monthLabel(h.effective_from_month)}</span>
                            <span className="font-bold">{money(Number(h.monthly_amount))}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* Payment amount */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">জমার পরিমাণ *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.paymentAmount}
                    onChange={(e) => set("paymentAmount", e.target.value)}
                    className="w-full pl-8 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold"
                    required
                  />
                </div>
                {/* Quick amount buttons */}
                {selectedMember && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[1, 2, 3].map((mult) => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => quickAmountMultiplier(mult)}
                        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg font-bold transition-colors"
                      >
                        {mult}x চাঁদা
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => set("paymentAmount", "")}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-rose-50 hover:text-rose-700 rounded-lg font-bold transition-colors"
                    >
                      কাস্টম
                    </button>
                  </div>
                )}
              </div>

              {/* Payment date */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">জমার তারিখ *</label>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => set("paymentDate", e.target.value)}
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>

              {/* Payment method */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">পেমেন্ট পদ্ধতি</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => set("paymentMethod", e.target.value)}
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="cash">নগদ (Cash)</option>
                  <option value="bkash">বিকাশ (bKash)</option>
                  <option value="nagad">নগদ (Nagad)</option>
                  <option value="bank">ব্যাংক (Bank)</option>
                </select>
              </div>

              {/* Receipt No */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">রসিদ নম্বর</label>
                <input
                  type="text"
                  value={form.receiptNo}
                  onChange={(e) => set("receiptNo", e.target.value)}
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                />
              </div>

              {/* Collected by */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">আদায়কারী *</label>
                <select
                  value={form.collectedBy}
                  onChange={(e) => set("collectedBy", e.target.value)}
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                >
                  <option value="">আদায়কারী সিলেক্ট করুন</option>
                  {treasurers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} {t.phone ? `(${t.phone})` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Payment note */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">জমার নোট</label>
                <textarea
                  value={form.note}
                  onChange={(e) => set("note", e.target.value)}
                  placeholder="ঐচ্ছিক — জমার বিষয়ে কোনো নোট..."
                  rows={2}
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                />
              </div>
            </div>

            {/* Coverage & Allocation */}
            <div className="card-premium p-5 space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" /> জমার কভারেজ ও বরাদ্দ
              </h2>

              {/* Coverage mode */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.coverageMode === "single"}
                    onChange={() => {
                      set("coverageMode", "single");
                      set("coverageEndMonth", form.coverageStartMonth);
                    }}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-bold text-gray-700">একক মাস</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.coverageMode === "range"}
                    onChange={() => set("coverageMode", "range")}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-bold text-gray-700">মাস সীমা</span>
                </label>
              </div>

              {/* Month inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">{form.coverageMode === "range" ? "শুরু মাস" : "মাস"}</label>
                  <input
                    type="month"
                    value={form.coverageStartMonth}
                    onChange={(e) => set("coverageStartMonth", e.target.value)}
                    className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
                {form.coverageMode === "range" && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">শেষ মাস</label>
                    <input
                      type="month"
                      value={form.coverageEndMonth}
                      onChange={(e) => set("coverageEndMonth", e.target.value)}
                      min={form.coverageStartMonth}
                      className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Warning for invalid range */}
              {form.coverageMode === "range" && form.coverageEndMonth < form.coverageStartMonth && (
                <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> শেষ মাস শুরু মাসের আগের হতে পারে না
                </p>
              )}

              {/* Custom allocation toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-500">কাস্টম বরাদ্দ (অ্যাডভান্সড)</span>
                <button
                  type="button"
                  onClick={() => {
                    const enabled = !form.customAllocationEnabled;
                    set("customAllocationEnabled", enabled);
                    if (enabled && form.customAllocations.length === 0) {
                      const months = monthRange(form.coverageStartMonth, form.coverageEndMonth);
                      set("customAllocations", months.map((m) => ({ month: m, amount: "" })));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    form.customAllocationEnabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {form.customAllocationEnabled ? "ON" : "OFF"}
                </button>
              </div>

              {form.customAllocationEnabled && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {form.customAllocations.map((alloc, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="month"
                        value={alloc.month}
                        onChange={(e) => updateCustomAllocation(i, "month", e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">৳</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={alloc.amount}
                          onChange={(e) => updateCustomAllocation(i, "amount", e.target.value)}
                          placeholder="0"
                          className="w-full pl-6 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomAllocation(i)}
                        className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCustomAllocation}
                    className="text-xs text-emerald-600 font-bold flex items-center gap-1 hover:text-emerald-700"
                  >
                    <Plus size={14} /> আরো মাস যোগ করুন
                  </button>
                </div>
              )}
            </div>

            {/* Pledge Change Section */}
            <div className="card-premium p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-emerald-600" /> মাসিক অঙ্গীকার পরিবর্তন
                </h2>
                <button
                  type="button"
                  onClick={() => set("pledgeChangeEnabled", !form.pledgeChangeEnabled)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    form.pledgeChangeEnabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {form.pledgeChangeEnabled ? "ON" : "OFF"}
                </button>
              </div>

              {form.pledgeChangeEnabled && (
                <div className="space-y-4">
                  {selectedMember && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400 font-bold">বর্তমান চাঁদা</p>
                      <p className="text-lg font-black text-gray-900">{money(Number(selectedMember.monthly_pledge) || 0)}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">নতুন চাঁদা *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.newPledgeAmount}
                          onChange={(e) => set("newPledgeAmount", e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">কার্যকর হবো *</label>
                      <input
                        type="month"
                        value={form.pledgeEffectiveMonth}
                        onChange={(e) => set("pledgeEffectiveMonth", e.target.value)}
                        className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">কারণ / নোট</label>
                    <textarea
                      value={form.pledgeChangeNote}
                      onChange={(e) => set("pledgeChangeNote", e.target.value)}
                      placeholder="যেমন: সদস্যের আর্থিক অবস্থা পরিবর্তনের কারণে..."
                      rows={2}
                      className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── Right: Allocation Preview ─── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card-premium p-5 sticky top-20">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-emerald-600" /> বরাদ্দ পর্বীক্ষণ
              </h2>

              {/* Payment summary */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-emerald-700 font-bold">জমা</span>
                  <span className="text-lg font-black text-emerald-700">
                    {form.paymentAmount ? money(parseFloat(form.paymentAmount) || 0) : money(0)}
                  </span>
                </div>
              </div>

              {/* Allocation table */}
              {allocationRows.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {allocationRows.map((row) => (
                    <div key={row.month} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="text-gray-700 font-medium">{monthLabel(row.month)}</span>
                        <span className="text-xs text-gray-400 ml-2">৳{row.expected}</span>
                      </div>
                      <span className={`font-bold ${
                        row.allocationType === "unallocated" ? "text-amber-600" : "text-emerald-600"
                      }`}>
                        {money(row.allocated)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-6">সদস্য ও জমার পরিমাণ নির্বাচন করুন</p>
              )}

              {/* Totals */}
              {allocationPreview.allocations.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-bold">বরাদ্দকৃত</span>
                    <span className="font-bold text-emerald-600">{money(allocationPreview.allocatedAmount)}</span>
                  </div>
                  {allocationPreview.unallocatedAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-600 font-bold">অবণ্টিত / অতিরিক্ত</span>
                      <span className="font-bold text-amber-600">{money(allocationPreview.unallocatedAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-900 font-black">জমা</span>
                    <span className="font-black text-emerald-700">{money(parseFloat(form.paymentAmount) || 0)}</span>
                  </div>

                  {/* Status badge */}
                  <div className={`mt-3 p-3 rounded-xl text-center text-sm font-bold ${
                    allocationPreview.unallocatedAmount === 0 && allocationPreview.allocatedAmount > 0
                      ? "bg-emerald-100 text-emerald-700"
                      : allocationPreview.unallocatedAmount > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                  }`}>
                    {allocationPreview.unallocatedAmount === 0 && allocationPreview.allocatedAmount > 0
                      ? "✓ পেমেন্ট সম্পূর্ণ বরাদ্দ"
                      : allocationPreview.unallocatedAmount > 0
                        ? `⚠ ৳${allocationPreview.unallocatedAmount.toLocaleString("bn-BD")} অবণ্টিত`
                        : "পেমেন্ট প্রয়োজন"}
                  </div>
                </div>
              )}

              {/* Save button */}
              <button
                type="button"
                onClick={openConfirm}
                disabled={submitting || !form.memberId || !form.paymentAmount || !form.collectedBy}
                className="w-full mt-5 btn-emerald py-3.5 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> সংরক্ষণ হচ্ছে...</> : <><CheckCircle2 className="w-4 h-4" /> জমা এন্ট্রি সংরক্ষণ করুন</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      {renderConfirmDialog()}
    </div>
  );
}
