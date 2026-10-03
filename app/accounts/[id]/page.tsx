"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Plus, X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Landmark, Wallet,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { isStaff as hasStaffRole } from "@/lib/auth";
import { toBengaliNumber, todayISO } from "@/lib/utils";

type Account = {
  id: string;
  name: string;
  type: "bank" | "cash";
  opening_balance: number;
  current_balance: number;
};

type Txn = {
  id: string;
  date: string;
  direction: "in" | "out";
  amount: number;
  particulars: string;
  remarks: string | null;
  transfer_id: string | null;
  balance_after: number;
};

const typeLabel = (t: string) => (t === "bank" ? "ব্যাংক" : "ক্যাশ");

export default function AccountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { role } = useAuth();
  const isStaff = hasStaffRole(role);

  const [account, setAccount] = useState<Account | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [allAccounts, setAllAccounts] = useState<{ id: string; name: string; type: string; current_balance: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    kind: "deposit" as "in" | "out" | "transfer" | "deposit",
    amount: "",
    date: todayISO(),
    particulars: "",
    remarks: "",
    to_account_id: "",
    from_account_id: "",
  });

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [detailRes, listRes] = await Promise.all([
        fetch(`/api/accounts/${id}`),
        fetch("/api/accounts"),
      ]);
      const detail = await detailRes.json();
      const list = await listRes.json();
      if (!detailRes.ok) throw new Error(detail.error || "লোড করা যায়নি");
      setAccount(detail.account);
      setTxns(detail.transactions);
      if (listRes.ok) {
        const others = (list.accounts as { id: string; name: string; type: string; current_balance: number }[]).filter((a) => a.id !== id);
        setAllAccounts(others);
        // Bank accounts: default to deposit mode with cash as source
        if (detail.account?.type === "bank") {
          const cash = (list.accounts as { id: string; name: string; type: string; current_balance: number }[]).find((a) => a.type === "cash");
          setForm((f) => ({
            ...f,
            kind: "deposit",
            from_account_id: cash?.id || "",
          }));
        }
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) fetchData();
    else setLoading(false);
  }, [isStaff, id]);

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError("টাকার পরিমাণ দিন");
      return;
    }
    if (!form.particulars.trim()) {
      setFormError("বিবরণ দিন");
      return;
    }
    if (form.kind === "transfer" && !form.to_account_id) {
      setFormError("গন্তব্য হিসাব নির্বাচন করুন");
      return;
    }
    if (form.kind === "deposit" && !form.from_account_id) {
      setFormError("উৎস হিসাব নির্বাচন করুন");
      return;
    }
    // Validate: deposit amount must not exceed source balance
    if (form.kind === "deposit" && form.from_account_id) {
      const src = allAccounts.find((a) => a.id === form.from_account_id);
      const bal = Number(src?.current_balance || 0);
      const amt = Number(form.amount);
      if (bal <= 0) {
        setFormError("উৎস হিসাবে কোনো ব্যালেন্স নেই — জমা করা যাবে না");
        return;
      }
      if (amt > bal) {
        setFormError(`উৎস হিসাবে মাত্র ৳${bal.toLocaleString("bn-BD")} আছে — ৳${amt.toLocaleString("bn-BD")} জমা করা যাবে না`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: form.kind === "deposit" ? "transfer" : form.kind,
          amount: Number(form.amount),
          date: form.date,
          particulars: form.particulars.trim(),
          remarks: form.remarks.trim() || undefined,
          to_account_id: form.kind === "transfer" ? form.to_account_id : undefined,
          from_account_id: form.kind === "deposit" ? form.from_account_id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "সংরক্ষণ করা যায়নি");
      setShowModal(false);
      setForm({
        kind: account?.type === "bank" ? "deposit" : "in", amount: "", date: todayISO(),
        particulars: "", remarks: "", to_account_id: "", from_account_id: "",
      });
      fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "সংরক্ষণ করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isStaff) {
    return <div className="p-8 text-center text-gray-500">এই পাতা শুধু স্টাফদের জন্য।</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (loadError || !account) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-600 font-medium">{loadError || "হিসাব পাওয়া যায়নি"}</p>
        <Link href="/accounts" className="btn-outline mt-4 text-sm">
          <ArrowLeft size={16} /> ফিরে যান
        </Link>
      </div>
    );
  }

  type KindKey = "in" | "out" | "transfer" | "deposit";
  const kindTabs: { key: KindKey; label: string; icon: typeof ArrowDownLeft; active: string }[] = [
    // Bank accounts: primary action is deposit FROM cash/balance
    ...(account?.type === "bank"
      ? [{ key: "deposit" as KindKey, label: "ব্যাংকে জমা", icon: ArrowDownLeft, active: "bg-emerald-600 text-white border-emerald-600" }]
      : []),
    { key: "in" as KindKey, label: account?.type === "bank" ? "বাইরে থেকে জমা" : "জমা", icon: ArrowDownLeft, active: "bg-emerald-600 text-white border-emerald-600" },
    { key: "out" as KindKey, label: "খরচ", icon: ArrowUpRight, active: "bg-rose-600 text-white border-rose-600" },
    { key: "transfer" as KindKey, label: "ট্রান্সফার", icon: ArrowLeftRight, active: "bg-blue-600 text-white border-blue-600" },
  ];

  return (
    <div className="pb-8 px-1 sm:px-0 animate-slide-up">
      <Link href="/accounts" className="inline-flex items-center gap-1 text-sm text-gray-500 font-medium mb-4">
        <ArrowLeft size={16} /> সব হিসাব
      </Link>

      <div className="card-premium p-5 sm:p-8 bg-[#064E3B] text-white border-none mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
            {account.type === "bank" ? <Landmark size={20} /> : <Wallet size={20} />}
          </div>
          <div>
            <h1 className="text-xl font-bold font-shadhinata">{account.name}</h1>
            <p className="text-xs text-white/50">{typeLabel(account.type)} হিসাব</p>
          </div>
        </div>
        <p className="text-3xl sm:text-4xl font-bold font-baloo mt-4">
          ৳{toBengaliNumber(Number(account.current_balance).toLocaleString("en-US"))}
        </p>
        <p className="text-xs text-white/50 mt-1">বর্তমান ব্যালেন্স</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-shadhinata text-gray-900">লেনদেনের তালিকা</h2>
        <button onClick={() => setShowModal(true)} className="btn-emerald h-10 px-4 text-sm">
          <Plus size={16} /> নতুন লেনদেন
        </button>
      </div>

      {txns.length === 0 ? (
        <div className="card-premium p-10 text-center text-gray-500">
          এখনো কোনো লেনদেন নেই।
        </div>
      ) : (
        <div className="space-y-2">
          {txns.map((t) => (
            <div
              key={t.id}
              className="card-premium p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    t.direction === "in"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {t.transfer_id ? (
                    <ArrowLeftRight size={18} />
                  ) : t.direction === "in" ? (
                    <ArrowDownLeft size={18} />
                  ) : (
                    <ArrowUpRight size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{t.particulars}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(t.date).toLocaleDateString("bn-BD")}
                    {t.transfer_id ? " · ট্রান্সফার" : ""}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p
                  className={`text-sm sm:text-base font-bold font-baloo ${
                    t.direction === "in" ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {t.direction === "in" ? "+" : "-"}৳
                  {toBengaliNumber(Number(t.amount).toLocaleString("en-US"))}
                </p>
                <p className="text-[10px] text-gray-400">
                  ব্যালেন্স ৳{toBengaliNumber(Number(t.balance_after).toLocaleString("en-US"))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold font-shadhinata">নতুন লেনদেন</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">{formError}</div>
            )}
            <div className="space-y-4">
              <div className="flex gap-2">
                {kindTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setForm({ ...form, kind: t.key })}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 ${
                      form.kind === t.key ? t.active : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    <t.icon size={14} /> {t.label}
                  </button>
                ))}
              </div>
              {form.kind === "transfer" && (
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">গন্তব্য হিসাব</label>
                  <select
                    value={form.to_account_id}
                    onChange={(e) => setForm({ ...form, to_account_id: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium"
                  >
                    <option value="">নির্বাচন করুন</option>
                    {allAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {form.kind === "deposit" && (
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">উৎস হিসাব (কোথা থেকে আসবে)</label>
                  <select
                    value={form.from_account_id}
                    onChange={(e) => setForm({ ...form, from_account_id: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium"
                  >
                    <option value="">নির্বাচন করুন</option>
                    {allAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — ৳{Number(a.current_balance || 0).toLocaleString("bn-BD")}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">সাধারণত ক্যাশ হিসাব থেকে ব্যাংকে জমা হয়</p>
                  {form.from_account_id && (() => {
                    const src = allAccounts.find((a) => a.id === form.from_account_id);
                    const bal = Number(src?.current_balance || 0);
                    if (bal <= 0) return <p className="text-[11px] font-bold text-rose-600 mt-1">⚠️ এই হিসাবে কোনো ব্যালেন্স নেই — জমা করা যাবে না</p>;
                    return <p className="text-[11px] font-bold text-emerald-700 mt-1">উপলব্ধ ব্যালেন্স: ৳{bal.toLocaleString("bn-BD")}</p>;
                  })()}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">টাকা (৳)</label>
                  <input
                    type="number" min="1"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">বিবরণ</label>
                <input
                  value={form.particulars}
                  onChange={(e) => setForm({ ...form, particulars: e.target.value })}
                  placeholder="যেমন: ব্যাংক ডিপোজিট, রসিদ বই"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">মন্তব্য (ঐচ্ছিক)</label>
                <input
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder=""
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-emerald w-full h-12 disabled:opacity-50"
              >
                {submitting ? "সংরক্ষণ হচ্ছে..." : "লেনদেন যোগ করুন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
