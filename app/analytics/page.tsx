"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Wallet,
  AlertTriangle,
  Award,
  Target,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import DefaulterReminderButton from "@/components/DefaulterReminderButton";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";
import { isStaff as hasStaffRole } from "@/lib/auth";
import {
  currentMonthStr,
  formatMoney,
  monthLabelBengali,
  toBengaliNumber,
  bengaliMonths,
} from "@/lib/utils";

type MemberRow = {
  id: string;
  name: string | null;
  phone: string | null;
  monthly_pledge: number | string | null;
  status: string | null;
  join_date: string | null;
};

type AllocRow = {
  member_id: string;
  month: string | null;
  amount: number | string;
  allocation_type: string;
};

type DonationRow = {
  id: string;
  member_id: string;
  amount: number | string;
  date: string;
  collected_by: string | null;
};

type UserRow = { id: string; name: string | null };

const WINDOW_MONTHS = 12;

/** "2026-10" shifted by delta months. */
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shortMonth(ym: string): string {
  const m = parseInt(ym.split("-")[1], 10);
  return bengaliMonths[m - 1].slice(0, 4);
}

const money = (v: number) => formatMoney(Math.round(v));
const num = (v: number | string | null | undefined) => Number(v) || 0;

export default function AnalyticsPage() {
  const { role } = useAuth();
  const isStaff = hasStaffRole(role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [allocs, setAllocs] = useState<AllocRow[]>([]);
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showAllDefaulters, setShowAllDefaulters] = useState(false);
  // F5: reminder status per member for the previous month
  const [reminderMap, setReminderMap] = useState<Record<string, string>>({});

  const nowYm = currentMonthStr();
  const startYm = shiftMonth(nowYm, -(WINDOW_MONTHS - 1));
  const reminderMonth = shiftMonth(nowYm, -1);

  useEffect(() => {
    if (!isStaff) {
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const client = supabase();
      const [mRes, aRes, dRes, uRes, rRes] = await Promise.all([
        client
          .from("members")
          .select("id, name, phone, monthly_pledge, status, join_date"),
        client
          .from("payment_allocations")
          .select("member_id, month, amount, allocation_type")
          .gte("month", startYm)
          .in("allocation_type", ["pledge", "advance"]),
        client
          .from("donations")
          .select("id, member_id, amount, date, collected_by")
          .gte("date", `${startYm}-01`),
        client.from("users").select("id, name"),
        // F5: reminders already sent for the previous month
        client
          .from("reminder_log")
          .select("member_id, status")
          .eq("month", reminderMonth),
      ]);
      if (mRes.error) throw mRes.error;
      if (aRes.error) throw aRes.error;
      if (dRes.error) throw dRes.error;
      setMembers((mRes.data || []) as MemberRow[]);
      setAllocs((aRes.data || []) as AllocRow[]);
      setDonations((dRes.data || []) as DonationRow[]);
      setUsers(((uRes.data || []) as UserRow[]).filter(Boolean));
      const rMap: Record<string, string> = {};
      for (const r of (rRes.data || []) as Array<{ member_id: string; status: string }>) {
        if (r.status === "sent") rMap[r.member_id] = "sent";
        else if (!rMap[r.member_id]) rMap[r.member_id] = r.status;
      }
      setReminderMap(rMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "তথ্য লোড করা যায়নি");
    }
    setLoading(false);
  }

  const months = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < WINDOW_MONTHS; i++) out.push(shiftMonth(startYm, i));
    return out;
  }, [startYm]);

  const activeMembers = useMemo(
    () => members.filter((m) => (m.status || "active") === "active"),
    [members]
  );

  /** Pledge counted only for months on/after the member's join month. */
  const eligibleInMonth = (m: MemberRow, ym: string) =>
    !m.join_date || m.join_date.slice(0, 7) <= ym;

  const expectedByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const ym of months) {
      let sum = 0;
      for (const m of activeMembers) {
        if (eligibleInMonth(m, ym)) sum += num(m.monthly_pledge);
      }
      map.set(ym, sum);
    }
    return map;
  }, [months, activeMembers]);

  const collectedByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of allocs) {
      if (!a.month) continue;
      map.set(a.month, (map.get(a.month) || 0) + num(a.amount));
    }
    return map;
  }, [allocs]);

  const paidByMemberMonth = useMemo(() => {
    // key: `${member_id}|${month}` → paid (pledge+advance)
    const map = new Map<string, number>();
    for (const a of allocs) {
      if (!a.month) continue;
      const k = `${a.member_id}|${a.month}`;
      map.set(k, (map.get(k) || 0) + num(a.amount));
    }
    return map;
  }, [allocs]);

  const trend = useMemo(
    () =>
      months.map((ym) => {
        const expected = expectedByMonth.get(ym) || 0;
        const collected = collectedByMonth.get(ym) || 0;
        return {
          ym,
          expected,
          collected,
          rate: expected > 0 ? (collected / expected) * 100 : 0,
        };
      }),
    [months, expectedByMonth, collectedByMonth]
  );

  const thisMonth = trend[trend.length - 1];

  // Last 6 *full* months (exclude the in-progress current month) for averages.
  const fullMonths = trend.slice(-7, -1);
  const avgMonthlyCollected =
    fullMonths.length > 0
      ? fullMonths.reduce((s, t) => s + t.collected, 0) / fullMonths.length
      : 0;
  const avgMonthlyExpected =
    fullMonths.length > 0
      ? fullMonths.reduce((s, t) => s + t.expected, 0) / fullMonths.length
      : 0;

  const defaulters = useMemo(() => {
    const rows: Array<{
      id: string;
      name: string;
      phone: string | null;
      pledge: number;
      arrears: number;
      monthsBehind: number;
    }> = [];
    for (const m of activeMembers) {
      const pledge = num(m.monthly_pledge);
      if (pledge <= 0) continue;
      let expected = 0;
      let paid = 0;
      for (const ym of months) {
        if (!eligibleInMonth(m, ym)) continue;
        expected += pledge;
        paid += paidByMemberMonth.get(`${m.id}|${ym}`) || 0;
      }
      const arrears = expected - paid;
      if (arrears > 0.5) {
        rows.push({
          id: m.id,
          name: m.name || "সদস্য",
          phone: m.phone,
          pledge,
          arrears,
          monthsBehind: arrears / pledge,
        });
      }
    }
    rows.sort((a, b) => b.arrears - a.arrears);
    return rows;
  }, [activeMembers, months, paidByMemberMonth]);

  const totalArrears = useMemo(
    () => defaulters.reduce((s, d) => s + d.arrears, 0),
    [defaulters]
  );

  const collectors = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const d of donations) {
      const key = d.collected_by || "__direct__";
      const cur = map.get(key) || { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += num(d.amount);
      map.set(key, cur);
    }
    const nameOf = (key: string) =>
      key === "__direct__"
        ? "সরাসরি / অ্যাডমিন"
        : users.find((u) => u.id === key)?.name || "অজ্ঞাত";
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, name: nameOf(key), ...v }))
      .sort((a, b) => b.amount - a.amount);
  }, [donations, users]);

  const maxTrend = Math.max(1, ...trend.map((t) => t.expected));
  const maxCollector = Math.max(1, ...collectors.map((c) => c.amount));

  if (!isStaff) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="text-center">
          <ShieldAlert size={40} className="mx-auto text-rose-400" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">
            প্রবেশাধিকার সংরক্ষিত
          </h1>
          <p className="mt-2 text-gray-500">
            অ্যানালিটিক্স শুধুমাত্র অ্যাডমিন ও ট্রেজারারদের জন্য।
          </p>
          <Link href="/dashboard" className="btn-outline mt-6 inline-flex">
            ড্যাশবোর্ডে ফিরুন
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="bg-white border-b border-gray-100 sticky top-16 lg:top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-emerald-700" size={23} />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              অ্যানালিটিক্স
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            গত {toBengaliNumber(WINDOW_MONTHS)} মাসের আদায় চিত্র — কোথায় টাকা
            আটকে আছে এক নজরে
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse"
                aria-hidden="true"
              >
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-7 bg-gray-100 rounded w-1/2 mt-3" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                  <Wallet size={14} className="text-emerald-600" />
                  চলতি মাসে আদায়
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {money(thisMonth.collected)}
                </p>
                <p className="text-xs mt-1 font-bold text-emerald-700">
                  {toBengaliNumber(thisMonth.rate.toFixed(0))}% সংগ্রহ
                  <span className="text-gray-400 font-normal">
                    {" "}
                    (লক্ষ্য {money(thisMonth.expected)})
                  </span>
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                  <AlertTriangle size={14} className="text-rose-500" />
                  মোট বকেয়া
                </div>
                <p className="text-2xl font-bold text-rose-600 mt-2">
                  {money(totalArrears)}
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  {toBengaliNumber(defaulters.length)} জন সদস্যের বকেয়া
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                  <Users size={14} className="text-blue-600" />
                  সক্রিয় সদস্য
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {toBengaliNumber(activeMembers.length)}
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  মাসিক প্রতিশ্রুতি মোট {money(avgMonthlyExpected)}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                  <TrendingUp size={14} className="text-amber-600" />
                  গড় মাসিক আদায়
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {money(avgMonthlyCollected)}
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  শেষ {toBengaliNumber(fullMonths.length)} পূর্ণ মাসের গড়
                </p>
              </div>
            </div>

            {/* Monthly trend */}
            <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
              <h2 className="font-bold text-gray-900">
                মাসিক আদায় ট্রেন্ড
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                সবুজ = আদায়, ধূসর পটভূমি = লক্ষ্য (সক্রিয় সদস্যদের প্রতিশ্রুতি)
              </p>
              <div className="mt-5 flex items-end gap-1.5 md:gap-2.5 h-44">
                {trend.map((t) => (
                  <div
                    key={t.ym}
                    className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
                    title={`${monthLabelBengali(t.ym)}: আদায় ${money(t.collected)} / লক্ষ্য ${money(t.expected)}`}
                  >
                    <span
                      className={`text-[10px] font-bold ${t.rate >= 90 ? "text-emerald-700" : t.rate >= 60 ? "text-amber-600" : "text-rose-500"}`}
                    >
                      {toBengaliNumber(t.rate.toFixed(0))}%
                    </span>
                    <div
                      className="w-full bg-gray-100 rounded-t-lg relative overflow-hidden"
                      style={{ height: "9rem" }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-lg transition-all"
                        style={{
                          height: `${Math.min(100, (t.collected / maxTrend) * 100)}%`,
                        }}
                      />
                      <div
                        className="absolute left-0 right-0 border-t-2 border-dashed border-gray-400"
                        style={{
                          bottom: `${Math.min(100, (t.expected / maxTrend) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold">
                      {shortMonth(t.ym)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  আদায়
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-gray-400 inline-block border-t-2 border-dashed border-gray-400" />
                  মাসিক লক্ষ্য
                </span>
              </div>
            </section>

            {/* Defaulters */}
            <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-500" />
                  বকেয়া তালিকা
                </h2>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                  মোট {money(totalArrears)}
                </span>
              </div>
              {defaulters.length === 0 ? (
                <p className="text-sm text-gray-500 mt-4 text-center py-6">
                  কোনো বকেয়া নেই — সবাই নিয়মিত দিচ্ছেন 🎉
                </p>
              ) : (
                <>
                  <div className="mt-4 space-y-2">
                    {(showAllDefaulters
                      ? defaulters
                      : defaulters.slice(0, 10)
                    ).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            {d.name}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {d.phone || "—"} ·{" "}
                            {toBengaliNumber(d.monthsBehind.toFixed(1))} মাস
                            বকেয়া
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-sm font-bold text-rose-600">
                            {money(d.arrears)}
                          </p>
                          <DefaulterReminderButton
                            memberId={d.id}
                            month={reminderMonth}
                            alreadySent={reminderMap[d.id] === "sent"}
                            onSent={(id, status) =>
                              setReminderMap((prev) => ({ ...prev, [id]: status }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {defaulters.length > 10 && (
                    <button
                      onClick={() => setShowAllDefaulters(!showAllDefaulters)}
                      className="mt-3 w-full text-center text-sm font-bold text-emerald-700 py-2.5 rounded-xl hover:bg-emerald-50"
                    >
                      {showAllDefaulters
                        ? "কম দেখুন"
                        : `আরও ${toBengaliNumber(defaulters.length - 10)} জন দেখুন`}
                    </button>
                  )}
                </>
              )}
              <p className="text-[11px] text-gray-400 mt-3">
                * বর্তমান মাসিক প্রতিশ্রুতি অনুযায়ী গত {toBengaliNumber(WINDOW_MONTHS)} মাসের
                হিসাব।
              </p>
            </section>

            {/* Collectors + Projection */}
            <div className="grid md:grid-cols-2 gap-5">
              <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Award size={18} className="text-amber-500" />
                  আদায়কারী পারফরম্যান্স
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  গত {toBengaliNumber(WINDOW_MONTHS)} মাসে কে কত সংগ্রহ করেছেন
                </p>
                <div className="mt-4 space-y-3">
                  {collectors.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-6">
                      কোনো তথ্য পাওয়া যায়নি
                    </p>
                  )}
                  {collectors.slice(0, 8).map((c, i) => (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-sm">
                        <p className="font-bold text-gray-800 flex items-center gap-2 min-w-0">
                          {i < 3 && (
                            <span
                              className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"}`}
                            >
                              {toBengaliNumber(i + 1)}
                            </span>
                          )}
                          <span className="truncate">{c.name}</span>
                        </p>
                        <p className="font-bold text-emerald-700 shrink-0">
                          {money(c.amount)}
                          <span className="text-[11px] text-gray-400 font-normal">
                            {" "}
                            · {toBengaliNumber(c.count)}টি জমা
                          </span>
                        </p>
                      </div>
                      <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                          style={{
                            width: `${(c.amount / maxCollector) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Target size={18} className="text-blue-600" />
                  পূর্বাভাস
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  শেষ {toBengaliNumber(fullMonths.length)} পূর্ণ মাসের গড় হারে
                </p>
                <div className="mt-4 space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                    <p className="text-xs font-bold text-gray-500">
                      বার্ষিক আদায়ের পূর্বাভাস
                    </p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {money(avgMonthlyCollected * 12)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-xs font-bold text-gray-500">
                      বার্ষিক লক্ষ্য (প্রতিশ্রুতি অনুযায়ী)
                    </p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      {money(avgMonthlyExpected * 12)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {avgMonthlyExpected > 0 ? (
                      <>
                        বর্তমান হারে বছরে লক্ষ্যের{" "}
                        <b className="text-gray-800">
                          {toBengaliNumber(
                            (
                              (avgMonthlyCollected / avgMonthlyExpected) *
                              100
                            ).toFixed(0)
                          )}
                          %
                        </b>{" "}
                        অর্জিত হবে। বকেয়া আদায় বাড়ালে এই হার বাড়বে।
                      </>
                    ) : (
                      "পূর্বাভাসের জন্য পর্যাপ্ত তথ্য নেই।"
                    )}
                  </p>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
