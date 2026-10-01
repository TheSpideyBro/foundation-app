"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { todayISO, currentMonthStr, formatMoney } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Banknote, Calendar, CheckCircle2,
  Loader2, ReceiptText, User, Wallet, AlertCircle, Eye, Download,
  Plus, Minus, Info, ChevronDown, ChevronUp, Pencil, X,
  FileCheck, ShieldCheck, TrendingDown, TrendingUp,
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import {
  calculatePaymentAllocation,
  pledgeBreakdown,
  monthRange,
  resolvePledgeForMonth,
  type PledgeHistoryEntry,
  type AllocationResult,
} from "@/lib/payment-ledger";
import { useAuth } from "@/components/providers";
import { isStaff as hasStaffRole } from "@/lib/auth";

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
};

type AllocationRow = {
  month: string;
  expected: number;
  allocated: number;
  allocationType: "pledge" | "advance" | "unallocated";
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// formatMoney from lib/utils.ts is the shared money formatter (bn-BD digits).
const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
const todayStr = () => todayISO();
const currentMonth = () => currentMonthStr();

/**
 * Longest coverage window the form will submit. Both canonical engines must
 * agree: monthRange() stops at 121 rows, the SQL engine loops the whole
 * range, so anything longer would be previewed one way and stored another.
 * Mirrors MAX_COVERAGE_MONTHS in app/api/payments/route.ts (BUG-022).
 */
const MAX_COVERAGE_MONTHS = 120;

function generateReceiptNo(): string {
  return `R-${Math.floor(100000 + Math.random() * 900000)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JomaEntryPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const isStaff = hasStaffRole(role);

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
  });

  // UI state
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ id: string; receipt: string; amount: number; extraAmount: number; allocatedAmount: number } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Filtered members for search
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const matched = q
      ? members.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.phone?.toLowerCase().includes(q) ||
            m.id.toLowerCase().includes(q),
        )
      : members;
    // Inactive members stay selectable (a final settlement is still paid),
    // but they must not sit where an active member is expected. Array.sort
    // is stable, so names keep their order inside each group (BUG-030).
    return [...matched].sort(
      (a, b) => Number(b.status !== "inactive") - Number(a.status !== "inactive"),
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

  // Is the pledge-change block valid right now?
  const pendingPledgeChange = useMemo(() => {
    if (!form.pledgeChangeEnabled || !form.memberId) return null;
    const amount = parseFloat(form.newPledgeAmount);
    const effective = form.pledgeEffectiveMonth;
    if (!Number.isFinite(amount) || amount <= 0 || !effective) return null;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(effective)) return null;
    return { amount, effective };
  }, [form.pledgeChangeEnabled, form.memberId, form.newPledgeAmount, form.pledgeEffectiveMonth]);

  // The pledge history the SERVER will see while allocating this payment:
  // save_payment_entry() writes the new history row (and the current pledge)
  // before it runs calculate_payment_allocation(), so months on/after the
  // effective month are priced at the new amount — and, because the engine
  // falls back to members.monthly_pledge for months with no history row, so
  // is the fallback (BUG-021). The preview must model exactly that or the
  // confirmation dialog and the stored rows disagree.
  const effectivePledgeHistory = useMemo<PledgeHistoryItem[]>(() => {
    if (!pendingPledgeChange) return memberPledgeHistory;
    return [
      ...memberPledgeHistory.filter((h) => h.effective_from_month !== pendingPledgeChange.effective),
      { member_id: form.memberId, monthly_amount: pendingPledgeChange.amount, effective_from_month: pendingPledgeChange.effective },
    ].sort((a, b) => a.effective_from_month.localeCompare(b.effective_from_month));
  }, [memberPledgeHistory, pendingPledgeChange, form.memberId]);

  const effectiveMonthlyPledge = pendingPledgeChange
    ? pendingPledgeChange.amount
    : selectedMember?.monthly_pledge ?? 0;

  // members.monthly_pledge is only the FALLBACK for months with no history
  // row — a later-effective history entry always wins, so the raw field can
  // disagree with what the engine charges (BUG-031: history said
  // 2026-09 → ৳1,000 while the card showed ৳100). Every "current pledge"
  // label must show the RESOLVED value, or the card and the allocation
  // preview next to it print two different numbers for the same member.
  const currentMonthPledge = useMemo(
    () => resolvePledgeForMonth(curMonth, Number(effectiveMonthlyPledge) || 0, effectivePledgeHistory),
    [curMonth, effectiveMonthlyPledge, effectivePledgeHistory],
  );
  // 1x/2x/3x চাঁদা set the amount for the COVERAGE month, not for today —
  // back-paying a cheaper month must not quote the current month's pledge.
  const coveragePledge = useMemo(
    () => resolvePledgeForMonth(form.coverageStartMonth || curMonth, Number(effectiveMonthlyPledge) || 0, effectivePledgeHistory),
    [form.coverageStartMonth, curMonth, effectiveMonthlyPledge, effectivePledgeHistory],
  );

  // Save button gating: the single "মোট নগদ" input must be positive, and a
  // member + collector must be chosen. The hint tells the user why the button
  // is disabled instead of leaving them guessing.
  const totalCash = parseFloat(form.paymentAmount) || 0;
  const saveDisabled = submitting || !form.memberId || totalCash <= 0 || !form.collectedBy;
  const saveHint = submitting
    ? null
    : !form.memberId
      ? "প্রথমে সদস্য নির্বাচন করুন"
      : totalCash <= 0
        ? "জমার পরিমাণ দিন"
        : !form.collectedBy
          ? "আদায়কারী নির্বাচন করুন"
          : null;
  // Load data
  useEffect(() => {
    async function load() {
      if (!isStaff) { setLoading(false); return; }
      setError(null);
      try {
        const [{ data: membersData, error: mErr }, { data: pledgeData, error: pErr }, { data: userData, error: uErr }] =
          await Promise.all([
            supabase().from("members").select("id, name, phone, monthly_pledge, status").order("name"),
            supabase().from("member_pledge_history").select("member_id, monthly_amount, effective_from_month, note, created_at, members(name)").order("effective_from_month", { ascending: true }),
            supabase().from("users").select("id, name, phone, role").in("role", ["admin", "treasurer"]),
          ]);
        // pErr/uErr used to be destructured and dropped: a failed
        // member_pledge_history read silently produced a preview that
        // disagreed with what the server persists.
        if (mErr || pErr || uErr) throw (mErr || pErr || uErr);
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
        // Seed the collector ONLY when empty, and only when this account is
        // actually one of the dropdown's options: seeding an id that has no
        // <option> left the select blank while the value was already set, so
        // a payment could be saved with a collector nobody ever saw (BUG-029).
        // The effect re-runs on every auth event (token refresh ~hourly),
        // which used to snap the dropdown back mid-entry — never overwrite.
        const isCollectorOption = (userData || []).some((u: any) => u.id === user?.id);
        if (user?.id && isCollectorOption) {
          setForm((f) => (f.collectedBy ? f : { ...f, collectedBy: user.id }));
        }
      } catch (e: any) {
        console.error("Joma load error:", e);
        setError(e.message || "লোড করতে সমস্যা হয়েছে");
      } finally {
        setLoading(false);
      }
    }
    load();
    // Depend on the id, not the user object: a new object identity per auth
    // event re-fetched everything and reset the form.
  }, [isStaff, user?.id]);

  // Leaving the page mid-submit must not leave a request running behind a
  // stale setState (BUG-030).
  useEffect(() => () => abortRef.current?.abort(), []);

  // Confirm dialog UX: Escape closes it, focus moves into the dialog on open
  // and returns to the trigger on close, and Tab cycles inside it.
  // Lightweight — no new dependency, just a keydown listener while open.
  const confirmDialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!showConfirm) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    confirmDialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowConfirm(false);
        return;
      }
      if (e.key === "Tab") {
        const dialog = confirmDialogRef.current;
        if (!dialog) return;
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [showConfirm]);

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
      effectiveMonthlyPledge,
      effectivePledgeHistory,
    );
  }, [form.memberId, form.paymentAmount, form.coverageStartMonth, form.coverageEndMonth, form.coverageMode, selectedMember, effectiveMonthlyPledge, effectivePledgeHistory]);

  // Auto-split of the cash handed over: the জমা field is the TOTAL, the
  // coverage window absorbs what it can and the rest becomes the extra
  // amount — derived here, never typed by hand. The API receives
  // `amount` (= allocatable) + `extra_amount` (= leftover), which is exactly
  // what the manual split used to send, so `donations.amount` still equals
  // total cash and the SQL engine still stores the extra as its own
  // unallocated row (parity with TS, ADR-001).
  const autoExtra = allocationPreview.unallocatedAmount;
  const autoAllocatable = allocationPreview.allocatedAmount;
  // A member whose coverage months are all ৳0 pledge can absorb nothing, and
  // save_payment_entry() rejects amount <= 0 — send the whole cash as the
  // regular amount so the engine parks it in the unallocated row (identical
  // rows; donations.extra_amount just stays 0 in this one edge case).
  const submitAmount = autoAllocatable > 0 ? autoAllocatable : (parseFloat(form.paymentAmount) || 0);
  const submitExtra = autoAllocatable > 0 ? autoExtra : 0;

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
      effectiveMonthlyPledge,
      effectivePledgeHistory,
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
  }, [form.memberId, form.paymentAmount, form.coverageStartMonth, form.coverageEndMonth, form.coverageMode, allocationPreview, effectiveMonthlyPledge, effectivePledgeHistory]);

  function set(field: keyof JomaForm, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function quickAmountMultiplier(multiplier: number) {
    // The coverage month's pledge, resolved through history — not the raw
    // members.monthly_pledge (BUG-031).
    const pledge = Number(coveragePledge) || 0;
    set("paymentAmount", String(pledge * multiplier));
  }

  // ─── Confirmation dialog ────────────────────────────────────────────────────

  // Enter anywhere in the entry form submits exactly like the Save button
  // (the form is noValidate, so the manual checks in openConfirm still run).
  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    openConfirm();
  }

  function openConfirm() {
    const amount = parseFloat(form.paymentAmount);
    const endMonth = form.coverageMode === "range" ? form.coverageEndMonth : form.coverageStartMonth;

    // The form uses noValidate: native constraint validation never runs, so
    // every check has to happen here or at the server — the Bengali messages
    // below stay the single source of truth for validation.
    if (!form.memberId) { setError("সদস্য নির্বাচন করুন"); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setError("জমার পরিমাণ শূন্যের চেয়ে বেশি হতে হবে"); return; }
    if (!form.paymentDate) { setError("তারিখ নির্বাচন করুন"); return; }
    if (!form.coverageStartMonth || !endMonth) { setError("কভারেজ মাস নির্বাচন করুন"); return; }
    if (form.coverageStartMonth > endMonth) { setError("কভারেজের শুরুর মাস শেষ মাসের আগে হতে হবে"); return; }
    // monthRange() truncates past 121 rows while the SQL engine does not —
    // a longer window would confirm one split and store another (BUG-022).
    if (monthRange(form.coverageStartMonth, endMonth).length > MAX_COVERAGE_MONTHS) {
      setError(`কভারেজের মাসসংখ্যা ${MAX_COVERAGE_MONTHS} মাসের বেশি হতে পারে না`);
      return;
    }
    if (!form.collectedBy) { setError("আদায়কারী নির্বাচন করুন"); return; }
    if (form.pledgeChangeEnabled) {
      const pledge = parseFloat(form.newPledgeAmount);
      if (!Number.isFinite(pledge) || pledge <= 0) {
        setError("নতুন মাসিক অঙ্গীকার শূন্যের চেয়ে বেশি পরিমাণ দিন");
        return;
      }
      if (!form.pledgeEffectiveMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(form.pledgeEffectiveMonth)) {
        setError("অঙ্গীকারের কার্যকর মাস নির্বাচন করুন");
        return;
      }
      // Backdating would rewrite months that are already reported — the
      // summary view, member ledger and Reports all read pledge history
      // from that month onward (BUG-023).
      if (form.pledgeEffectiveMonth < form.coverageStartMonth) {
        setError("অঙ্গীকারের কার্যকর মাস কভারেজের শুরুর মাসের আগে হতে পারে না");
        return;
      }
    }
    setError(null);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);
    setSubmitting(true);
    setError(null);

    // The dialog is already closed at this point, so a hung request used to
    // leave the button on "সংরক্ষণ হচ্ছে..." with no way out (BUG-030).
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 30000);

    try {
      // Auto-split: `amount` is only what the coverage window can absorb,
      // `extra_amount` is the leftover — one number typed by the operator,
      // the two fields are derived from the same preview.
      const amount = submitAmount;
      const extraAmount = submitExtra;
      const endMonth = form.coverageMode === "range" ? form.coverageEndMonth : form.coverageStartMonth;

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: form.memberId,
          amount,
          extra_amount: extraAmount,
          date: form.paymentDate,
          method: form.paymentMethod,
          receipt_no: form.receiptNo,
          coverage_start_month: form.coverageStartMonth,
          coverage_end_month: endMonth,
          collected_by: form.collectedBy,
          note: form.note || null,
          pledge_change_amount: form.pledgeChangeEnabled ? parseFloat(form.newPledgeAmount) : null,
          pledge_effective_month: form.pledgeChangeEnabled ? form.pledgeEffectiveMonth || null : null,
          pledge_change_note: form.pledgeChangeNote || null,
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const raw = String(data.error || "সেভ করতে সমস্যা হয়েছে");
        if (data.code === "duplicate_receipt" || /duplicate key|receipt_no/i.test(raw)) {
          // Same receipt number => the earlier attempt almost certainly
          // committed (timeout after write). Retrying blindly would either
          // duplicate the payment or hit this again.
          throw new Error("এই রসিদ নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে — সম্ভবত আগের এন্ট্রি সংরক্ষিত হয়ে গেছে। জমা তালিকা দেখে নিন।");
        }
        throw new Error(raw);
      }

      // Success numbers: the cash handed over, the allocatable part and the
      // derived extra — one label per number, so the preview, the dialog and
      // the receipt cannot disagree (BUG-028).
      setSuccessData({
        id: data.payment_id,
        receipt: form.receiptNo,
        amount,
        extraAmount,
        allocatedAmount: allocationPreview.allocatedAmount,
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
      });
      // The reset clears memberId but used to leave the previous member's
      // name in the search box, so the next save failed against a box that
      // looked filled (BUG-028).
      setMemberSearch("");
      setShowMemberDropdown(false);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setError("সার্ভার থেকে সাড়া পাওয়া যায়নি — আবার চেষ্টা করুন");
      } else {
        setError(e.message || "সেভ করতে সমস্যা হয়েছে");
      }
    } finally {
      window.clearTimeout(timer);
      if (abortRef.current === controller) abortRef.current = null;
      setSubmitting(false);
    }
  }

  function handleCancel() {
    // The control is labelled "ফিরে যান" (go back) — sending everyone to
    // /donations was the wrong destination (BUG-030).
    if (window.history.length > 1) router.back();
    else router.push("/donations");
  }

  // ─── Loading / role gate ───────────────────────────────────────────────────

  // auth gate FIRST: `role` is still null until the auth context resolves, so
  // a staff user would otherwise be shown the access-denied screen on the
  // first paint (BUG-027). One spinner covers auth bootstrap and data load.
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-gray-500 font-bold">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center p-8">
          <ShieldCheck className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 font-tiro mb-2">প্রবেশাধিকার সংরক্ষিত</h1>
          <p className="text-gray-500">এই পেজটি শুধুমাত্র স্টাফ সদস্যদের জন্য।</p>
          <button onClick={() => router.push("/dashboard")} className="mt-6 btn-emerald">ড্যাশবোর্ডে যান</button>
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
                <p className="text-xs text-gray-400 font-bold mb-1">মোট নগদ</p>
                <p className="font-bold text-emerald-600">{formatMoney(successData.amount + successData.extraAmount)}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs text-amber-600 font-bold mb-1">অতিরিক্ত জমা</p>
                <p className="font-bold text-amber-700">{formatMoney(successData.extraAmount)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                <p className="text-xs text-gray-400 font-bold mb-1">বরাদ্দ</p>
                <p className="font-bold text-gray-900">{formatMoney(successData.allocatedAmount)}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8 justify-center flex-wrap">
              <a href={`/api/receipts/${successData.id}`} target="_blank" rel="noreferrer" className="btn-emerald">
                <Eye size={17} /> রসিদ প্রিভিউ
              </a>
              <a href={`/api/receipts/${successData.id}?download=1`} download={`Receipt-${successData.receipt}.jpg`} className="btn-outline">
                <Download size={17} /> ডাউনলোড
              </a>
              <button onClick={() => setSuccessData(null)} className="btn-outline">
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
        <div
          ref={confirmDialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="জমা এন্ট্রি নিশ্চিত করুন"
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        >
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

            {/* Payment — the cash handed over; the split below derives from it */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Banknote className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-bold">মোট নগদ</p>
                <p className="font-black text-emerald-600 text-lg">{formatMoney(parseFloat(form.paymentAmount) || 0)}</p>
              </div>
            </div>

            {/* Extra amount — derived from what the coverage window cannot
                absorb (auto-split), persisted as its own allocation row. */}
            {autoExtra > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                <Banknote className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-amber-700 font-bold">অতিরিক্ত জমা</p>
                  <p className="font-black text-amber-700">{formatMoney(autoExtra)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-bold">বরাদ্দ</p>
                  <p className="font-black text-gray-900">{formatMoney(autoAllocatable)}</p>
                </div>
              </div>
            )}

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
                    <span className="font-bold text-gray-900">{formatMoney(row.allocated)}</span>
                  </div>
                ))}
                {autoExtra > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-amber-600 font-bold">অতিরিক্ত জমা</span>
                    <span className="font-bold text-amber-600">{formatMoney(autoExtra)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-2 border-t-2 border-gray-200">
                  <span>মোট বরাদ্দ</span>
                  <span className="text-emerald-600">{formatMoney(autoAllocatable)}</span>
                </div>
              </div>
            </div>

            {/* Pledge change */}
            {form.pledgeChangeEnabled && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-700 font-bold mb-2">মাসিক অঙ্গীকার পরিবর্তন</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">{selectedMember ? formatMoney(currentMonthPledge) : "—"}</span>
                  <TrendingDown className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-emerald-600">{formatMoney(parseFloat(form.newPledgeAmount) || 0)}</span>
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
              className="flex-1 btn-outline text-sm"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-[2] btn-emerald text-sm disabled:opacity-50"
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

      <form noValidate onSubmit={handleFormSubmit} className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
                    role="combobox"
                    aria-expanded={showMemberDropdown}
                    aria-autocomplete="list"
                    aria-controls="member-listbox"
                    placeholder="সদস্যের নাম বা ফোন নম্বর লিখুন..."
                    value={memberSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMemberSearch(value);
                      setShowMemberDropdown(true);
                      // Editing the box no longer matches the chosen member:
                      // keep them in sync or the donation is saved for the
                      // previously clicked member while the box shows another.
                      if (selectedMember && value !== selectedMember.name) set("memberId", "");
                    }}
                    onFocus={() => setShowMemberDropdown(true)}
                    onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
                    className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                {showMemberDropdown && (
                  <div id="member-listbox" role="listbox" aria-label="সদস্য তালিকা" className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={form.memberId === m.id}
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
                      ))
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-400 font-medium">কোনো সদস্য পাওয়া যায়নি</p>
                    )}
                  </div>
                )}
              </div>

              {/* Member info display */}
              {selectedMember && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-600 font-bold">বর্তমান মাসিক অঙ্গীকার</p>
                      <p className="text-lg font-black text-emerald-700">{formatMoney(currentMonthPledge)}</p>
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
                            <span className="font-bold">{formatMoney(Number(h.monthly_amount))}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* Payment amount */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">মোট নগদ *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                  <input
                    type="number"
                    inputMode="decimal"
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

              {/* Extra amount — derived, never typed: whatever the coverage
                  window cannot absorb becomes donations.extra_amount. */}
              <div>
                <label className="text-xs font-bold text-amber-700 mb-1 block">অতিরিক্ত জমা (স্বয়ংক্রিয়)</label>
                <div className="w-full px-3 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm font-black text-amber-700">
                  {formatMoney(autoExtra)}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">জমার পরিমাণ থেকে কভারেজ যতটুকু নেয় না, বাকিটুকু এখানে চলে আসে; মাসিক বরাদ্দে যাবে না, রসিদে আলাদাভাবে দেখানো হবে।</p>
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
              {/* monthRange() stops at 121 months, the SQL engine does not —
                  beyond that the preview would not match the stored rows */}
              {form.coverageMode === "range" &&
                monthRange(form.coverageStartMonth, form.coverageEndMonth).length > MAX_COVERAGE_MONTHS && (
                <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> কভারেজের মাসসংখ্যা {MAX_COVERAGE_MONTHS} মাসের বেশি হতে পারে না
                </p>
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
                  {form.pledgeChangeEnabled ? "চালু" : "বন্ধ"}
                </button>
              </div>

              {form.pledgeChangeEnabled && (
                <div className="space-y-4">
                  {selectedMember && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400 font-bold">বর্তমান চাঁদা</p>
                      <p className="text-lg font-black text-gray-900">{formatMoney(currentMonthPledge)}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">নতুন চাঁদা *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                        <input
                          type="number"
                          inputMode="decimal"
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
                        min={form.coverageStartMonth}
                        className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                  {/* A month before this payment's window would rewrite
                      months that are already reported (BUG-023) */}
                  {form.pledgeEffectiveMonth && form.pledgeEffectiveMonth < form.coverageStartMonth && (
                    <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> কার্যকর মাস কভারেজের শুরুর মাসের আগে হতে পারে না
                    </p>
                  )}
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

              {/* Payment summary — the same three numbers the confirmation
                  dialog and the success screen show: cash, allocated, extra */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-emerald-700 font-bold">মোট নগদ</span>
                  <span className="text-lg font-black text-emerald-700">
                    {form.paymentAmount ? formatMoney(parseFloat(form.paymentAmount) || 0) : formatMoney(0)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-emerald-700 font-bold">বরাদ্দ</span>
                  <span className="text-sm font-black text-emerald-700">{money(autoAllocatable)}</span>
                </div>
                {autoExtra > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-100">
                    <span className="text-xs text-amber-700 font-bold">অতিরিক্ত জমা</span>
                    <span className="text-sm font-black text-amber-700">{formatMoney(autoExtra)}</span>
                  </div>
                )}
              </div>

              {/* Allocation table */}
              {allocationRows.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {allocationRows.map((row) => (
                    <div key={row.month} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="text-gray-700 font-medium">{monthLabel(row.month)}</span>
                        <span className="text-xs text-gray-400 ml-2">{formatMoney(row.expected)}</span>
                      </div>
                      <span className={`font-bold ${
                        row.allocationType === "unallocated" ? "text-amber-600" : "text-emerald-600"
                      }`}>
                        {formatMoney(row.allocated)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-6">সদস্য ও জমার পরিমাণ নির্বাচন করুন</p>
              )}

              {/* Status — মোট নগদ / বরাদ্দ / অতিরিক্ত জমা are in the summary
                  above, one label per number (BUG-028). An extra amount is the
                  normal result of handing over more cash than the coverage
                  window can absorb, so it is not a warning. */}
                <div className={`mt-3 p-3 rounded-xl text-center text-sm font-bold ${
                  autoExtra === 0 && autoAllocatable > 0
                    ? "bg-emerald-100 text-emerald-700"
                    : autoExtra > 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-500"
                }`}>
                  {autoExtra === 0 && autoAllocatable > 0
                    ? "✓ পেমেন্ট সম্পূর্ণ বরাদ্দ"
                    : autoExtra > 0
                      ? `${formatMoney(autoAllocatable)} বরাদ্দ • ${formatMoney(autoExtra)} অতিরিক্ত জমা`
                      : "পেমেন্ট প্রয়োজন"}
                </div>
              )}

              {/* Save button — a real submit button inside the <form>, so Enter
                  anywhere in the form runs the same flow as clicking it. */}
              <button
                type="submit"
                disabled={saveDisabled}
                className="w-full mt-5 btn-emerald py-3.5 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> সংরক্ষণ হচ্ছে...</> : <><CheckCircle2 className="w-4 h-4" /> জমা এন্ট্রি সংরক্ষণ করুন</>}
              </button>
              {saveHint && (
                <p className="text-[11px] text-gray-400 text-center mt-2 font-medium">{saveHint}</p>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation dialog */}
      {renderConfirmDialog()}
    </div>
  );
}
