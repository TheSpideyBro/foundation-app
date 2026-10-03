"use client";

import { useState, useEffect } from "react";
import { BookOpen, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/components/providers";
import { isStaff as hasStaffRole } from "@/lib/auth";
import { toBengaliNumber } from "@/lib/utils";
import { getSupabase as supabase } from "@/lib/supabase-client";

type Entry = {
  id: string;
  date: string;
  particulars: string;
  type: "in" | "out";
  source: "donation" | "expense" | "bank_deposit";
  amount: number;
  balance: number;
};

export default function CashbookPage() {
  const { role } = useAuth();
  const isStaff = hasStaffRole(role);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState(0);

  useEffect(() => {
    if (isStaff) fetchCashbook();
    else setLoading(false);
  }, [isStaff]);

  const fetchCashbook = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [
        { data: donations, error: dErr },
        { data: expenses, error: eErr },
        { data: bankTxns, error: bErr },
      ] = await Promise.all([
        supabase()
          .from("donations")
          .select("id, amount, date, members(name)")
          .order("date", { ascending: true }),
        supabase()
          .from("expenses")
          .select("id, amount, date, description")
          .order("date", { ascending: true }),
        // Bank deposits are cash outflows (transferred to bank)
        supabase()
          .from("account_transactions")
          .select("id, amount, date, particulars, account_id, accounts!inner(type)")
          .eq("direction", "in")
          .eq("accounts.type", "bank")
          .order("date", { ascending: true }),
      ]);
      if (dErr) throw new Error("জমার তথ্য আনা যায়নি");
      if (eErr) throw new Error("খরচের তথ্য আনা যায়নি");
      if (bErr) throw new Error("ব্যাংক জমার তথ্য আনা যায়নি");

      const raw: Omit<Entry, "balance">[] = [
        ...(donations || []).map((d: any) => ({
          id: `d-${d.id}`,
          date: d.date,
          particulars: d.members?.name || "অজ্ঞাত সদস্য",
          type: "in" as const,
          source: "donation" as const,
          amount: Number(d.amount),
        })),
        ...(expenses || []).map((e: any) => ({
          id: `e-${e.id}`,
          date: e.date,
          particulars: e.description || "খরচ",
          type: "out" as const,
          source: "expense" as const,
          amount: Number(e.amount),
        })),
        ...(bankTxns || []).map((t: any) => ({
          id: `b-${t.id}`,
          date: t.date,
          particulars: `ব্যাংক ডিপোজিট — ${t.particulars}`,
          type: "out" as const,
          source: "bank_deposit" as const,
          amount: Number(t.amount),
        })),
      ];

      // Chronological; tie-break: income before expense on same date
      raw.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (a.type !== b.type) return a.type === "in" ? -1 : 1;
        return 0;
      });

      let running = 0;
      const withBalance = raw.map((r) => {
        running += r.type === "in" ? r.amount : -r.amount;
        return { ...r, balance: running };
      });

      setEntries(withBalance);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  };

  const totalIn = entries.filter((e) => e.type === "in").reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter((e) => e.source === "expense").reduce((s, e) => s + e.amount, 0);
  const totalBankDeposit = entries.filter((e) => e.source === "bank_deposit").reduce((s, e) => s + e.amount, 0);
  const totalOut = totalExpense + totalBankDeposit;
  const closing = totalIn - totalOut;

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

  return (
    <div className="pb-8 px-1 sm:px-0 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
          <BookOpen size={20} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-shadhinata text-gray-900">
            ক্যাশ বই
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">সব জমা ও খরচ — তারিখের ক্রমানুসারে</p>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card-premium p-4 text-center">
          <p className="text-[10px] font-bold text-gray-500 mb-1">মোট জমা</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-700 font-baloo">
            ৳{toBengaliNumber(totalIn.toLocaleString("en-US"))}
          </p>
        </div>
        <div className="card-premium p-4 text-center">
          <p className="text-[10px] font-bold text-gray-500 mb-1">মোট খরচ</p>
          <p className="text-lg sm:text-xl font-bold text-rose-600 font-baloo">
            ৳{toBengaliNumber(totalExpense.toLocaleString("en-US"))}
          </p>
        </div>
        <div className="card-premium p-4 text-center">
          <p className="text-[10px] font-bold text-gray-500 mb-1">ব্যাংক ডিপোজিট</p>
          <p className="text-lg sm:text-xl font-bold text-blue-600 font-baloo">
            ৳{toBengaliNumber(totalBankDeposit.toLocaleString("en-US"))}
          </p>
        </div>
        <div className="card-premium p-4 text-center bg-emerald-50/50">
          <p className="text-[10px] font-bold text-gray-500 mb-1">ব্যালেন্স</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 font-baloo">
            ৳{toBengaliNumber(closing.toLocaleString("en-US"))}
          </p>
        </div>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="card-premium p-10 text-center text-gray-500">
          এখনো কোনো লেনদেন নেই।
        </div>
      ) : (
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px] sm:min-w-[560px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] sm:text-[11px]">
                  <th className="text-center font-bold px-2 sm:px-3 py-2 sm:py-3">ক্রঃ</th>
                  <th className="text-left font-bold px-2 sm:px-4 py-2 sm:py-3">তারিখ</th>
                  <th className="text-left font-bold px-2 sm:px-4 py-2 sm:py-3">বিবরণ</th>
                  <th className="text-right font-bold px-2 sm:px-4 py-2 sm:py-3">জমা</th>
                  <th className="text-right font-bold px-2 sm:px-4 py-2 sm:py-3">খরচ</th>
                  <th className="text-right font-bold px-2 sm:px-4 py-2 sm:py-3">ব্যালেন্স</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-2 sm:px-3 py-2 sm:py-3 text-center text-gray-400 text-[11px] sm:text-xs font-medium">
                      {toBengaliNumber(String(idx + 1))}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-gray-500 text-[11px] sm:text-xs">
                      {new Date(e.date).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 text-xs sm:text-sm break-words min-w-0">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            e.type === "in"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {e.type === "in" ? (
                            <ArrowDownLeft size={14} />
                          ) : (
                            <ArrowUpRight size={14} />
                          )}
                        </span>
                        <span className="break-words">
                          {e.particulars}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold text-emerald-700 font-baloo text-xs sm:text-sm whitespace-nowrap">
                      {e.type === "in" ? toBengaliNumber(e.amount.toLocaleString("en-US")) : "—"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold text-rose-600 font-baloo text-xs sm:text-sm whitespace-nowrap">
                      {e.type === "out" ? toBengaliNumber(e.amount.toLocaleString("en-US")) : "—"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold text-gray-700 font-baloo text-xs sm:text-sm whitespace-nowrap">
                      {toBengaliNumber(e.balance.toLocaleString("en-US"))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
