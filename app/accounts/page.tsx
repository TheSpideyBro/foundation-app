"use client";

import { useState, useEffect } from "react";
import { Landmark, Wallet, Plus, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { isStaff as hasStaffRole } from "@/lib/auth";
import { toBengaliNumber } from "@/lib/utils";

type Account = {
  id: string;
  name: string;
  type: "bank" | "cash";
  opening_balance: number;
  current_balance: number;
  transaction_count: number;
};

const typeLabel = (t: string) => (t === "bank" ? "ব্যাংক" : "ক্যাশ");

export default function AccountsPage() {
  const { role } = useAuth();
  const isStaff = hasStaffRole(role);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "cash", opening_balance: "" });

  const fetchAccounts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "লোড করা যায়নি");
      setAccounts(data.accounts);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) fetchAccounts();
    else setLoading(false);
  }, [isStaff]);

  const handleCreate = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("হিসাবের নাম দিন");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          opening_balance: Number(form.opening_balance) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "তৈরি করা যায়নি");
      setShowModal(false);
      setForm({ name: "", type: "cash", opening_balance: "" });
      fetchAccounts();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "তৈরি করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance), 0);

  if (!isStaff) {
    return (
      <div className="p-8 text-center text-gray-500">
        এই পাতা শুধু স্টাফদের জন্য।
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-8 px-1 sm:px-0 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-shadhinata text-gray-900">
            ব্যাংক/ক্যাশ হিসাব
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            মোট ব্যালেন্স:{" "}
            <span className="font-bold text-emerald-700">
              ৳{toBengaliNumber(totalBalance.toLocaleString("en-US"))}
            </span>
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-emerald h-11 px-4 text-sm">
          <Plus size={18} /> নতুন হিসাব
        </button>
      </div>

      {loadError && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      {accounts.length === 0 && !loadError ? (
        <div className="card-premium p-12 text-center">
          <Landmark size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">এখনো কোনো হিসাব যোগ করা হয়নি।</p>
          <p className="text-xs text-gray-400 mt-1">
            নতুন হিসাব বোতামে ক্লিক করে ব্যাংক বা ক্যাশ হিসাব যোগ করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <Link
              key={a.id}
              href={`/accounts/${a.id}`}
              className="card-premium p-5 sm:p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-white ${
                    a.type === "bank" ? "bg-blue-600" : "bg-emerald-600"
                  }`}
                >
                  {a.type === "bank" ? <Landmark size={20} /> : <Wallet size={20} />}
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  {typeLabel(a.type)}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 font-shadhinata text-lg mb-1 truncate">
                {a.name}
              </h3>
              <p className="text-2xl font-bold text-gray-900 font-baloo">
                ৳{toBengaliNumber(Number(a.current_balance).toLocaleString("en-US"))}
              </p>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                {toBengaliNumber(String(a.transaction_count))}টি লেনদেন
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </p>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold font-shadhinata">নতুন হিসাব</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">{formError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">হিসাবের নাম</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="যেমন: ইসলামী ব্যাংক, ক্যাশ ইন হ্যান্ড"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">ধরন</label>
                <div className="flex gap-2">
                  {(["cash", "bank"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, type: t })}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold border ${
                        form.type === t
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {typeLabel(t)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">
                  প্রারম্ভিক ব্যালেন্স (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.opening_balance}
                  onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="btn-emerald w-full h-12 disabled:opacity-50"
              >
                {submitting ? "সংরক্ষণ হচ্ছে..." : "হিসাব তৈরি করুন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
