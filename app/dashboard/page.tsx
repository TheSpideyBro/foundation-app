"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import {
  Wallet, ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";
import { formatMoney, toBengaliNumber, bengaliShortMonths } from "@/lib/utils";

const C = {
  ink: "#1B4332",
  paper: "#FBF8F1",
  page: "#EDEAE0",
  border: "#E4DCC8",
  gold: "#C9972D",
  red: "#A63D40",
  text: "#2B2B26",
  sub: "#8A8371",
  label: "#7A7364",
};

function Stub({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: number; sub?: string; accent: string;
}) {
  return (
    <div className="relative rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.12)] border overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />
      <div className="pl-6 pr-5 py-5 flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.14em] uppercase font-medium" style={{ fontFamily: "'Hind Siliguri', sans-serif", color: C.label }}>{label}</p>
          <p className="mt-2 text-[26px] leading-none font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.text }}>{formatMoney(value)}</p>
          {sub && <p className="mt-1.5 text-[12px]" style={{ fontFamily: "'Hind Siliguri', sans-serif", color: C.sub }}>{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: accent + "1A" }}>
          <Icon size={17} strokeWidth={1.8} style={{ color: accent }} />
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, actionLabel, onAction }: {
  title: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-[19px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>{title}</h1>
      {actionLabel && (
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-sm hover:brightness-105 transition"
          style={{ background: C.gold, color: C.ink }}
        >
          <Wallet size={15} strokeWidth={2.5} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [totalDonation, setTotalDonation] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const piePalette = ["#1B4332", "#C9972D", "#A63D40", "#5C7A63", "#8A7348", "#6B5B3E", "#B04A50", "#93A3B8"];
  useEffect(() => {
    // If the auth check hasn't resolved yet, don't start fetching —
    // Supabase calls would run with an empty session and never settle.
    if (user === undefined) return; // auth still initializing
    if (!user) { setLoading(false); return; } // signed out / mock mode — don't hang the UI

    async function fetchData() {
      try {
        // Fetch donations
        const { data: donations } = await supabase()
          .from("donations")
          .select(`*, members(name)`)
          .order("created_at", { ascending: false });

        // Fetch expenses
        const { data: expenses } = await supabase()
          .from("expenses")
          .select("*")
          .order("created_at", { ascending: false });

        // Calculate totals
        const totalDon = donations?.reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0;
        const totalExp = expenses?.reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0;

        setTotalDonation(totalDon);
        setTotalExpense(totalExp);

        // Build monthly data
        const monthMap: Record<string, { jonmo: number; khoroch: number }> = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthMap[key] = { jonmo: 0, khoroch: 0 };
        }

        donations?.forEach((don: any) => {
          const d = new Date(don.date);
          if (isNaN(d.getTime())) return; // skip rows with unparseable dates
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (monthMap[key]) monthMap[key].jonmo += don.amount;
        });

        expenses?.forEach((exp: any) => {
          const d = new Date(exp.date);
          if (isNaN(d.getTime())) return; // skip rows with unparseable dates
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (monthMap[key]) monthMap[key].khoroch += exp.amount;
        });

        const chartData = Object.entries(monthMap).map(([key, vals]) => {
          const [year, month] = key.split("-");
          return {
            month: bengaliShortMonths[parseInt(month) - 1],
            jonmo: vals.jonmo,
            khoroch: vals.khoroch,
          };
        });
        setMonthlyData(chartData);

        // ---- Expense by category (pie) — all time ----
        const catMap: Record<string, number> = {};
        expenses?.forEach((exp: any) => {
          const cat = (exp.category || "অন্যান্য").trim();
          catMap[cat] = (catMap[cat] || 0) + (exp.amount || 0);
        });
        const pieData = Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + "…" : name, value }));
        setCategoryData(pieData);

        // ---- Yearly donation trend (line) — last 5 years ----
        const yearMap: Record<string, number> = {};
        const thisYear = new Date().getFullYear();
        for (let i = 4; i >= 0; i--) yearMap[String(thisYear - i)] = 0;
        donations?.forEach((don: any) => {
          const d = new Date(don.date);
          if (isNaN(d.getTime())) return;
          const y = String(d.getFullYear());
          if (yearMap[y] !== undefined) yearMap[y] += don.amount;
        });
        const lineData = Object.entries(yearMap).map(([year, total]) => ({
          year: toBengaliNumber(year),
          jonmo: total,
        }));
        setYearlyData(lineData);

        // Combine recent entries — keep original dates for sorting
        const donationEntries = (donations || []).map((d: any) => ({
          id: d.receipt_no,
          name: d.members?.name || "অজানা",
          amount: d.amount,
          date: !isNaN(new Date(d.date).getTime())
            ? new Date(d.date).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" })
            : d.date || "—",
          method: d.method,
          type: "in" as const,
          _sortDate: new Date(d.created_at || d.date).getTime(),
        }));

        const expenseEntries = (expenses || []).map((e: any) => ({
          id: `E-${e.id.slice(0, 8)}`,
          name: e.description || e.category,
          amount: e.amount,
          date: new Date(e.date).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" }),
          method: e.category,
          type: "out" as const,
          _sortDate: new Date(e.created_at || e.date).getTime(),
        }));

        const all = [...donationEntries, ...expenseEntries]
          .sort((a, b) => b._sortDate - a._sortDate)
          .slice(0, 5)
          .map(({ _sortDate, ...rest }) => rest); // strip internal sort key
        setRecentEntries(all);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20" style={{ color: C.sub }}>
          ডেটা লোড হচ্ছে...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="ড্যাশবোর্ড" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stub icon={Wallet} label="মোট তহবিল" value={totalDonation} accent={C.ink} sub="সর্বমোট জমাকৃত অর্থ" />
        <Stub icon={ArrowUpCircle} label="মোট খরচ" value={totalExpense} accent={C.red} sub="সহায়তায় ব্যয়িত" />
        <Stub icon={ArrowDownCircle} label="বর্তমান ব্যালেন্স" value={totalDonation - totalExpense} accent={C.gold} sub="তহবিলে জমা আছে" />
      </div>

      {/* Monthly Chart */}
      <div className="mt-6 rounded-sm border p-6 relative overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
        <div className="absolute left-[52px] top-0 bottom-0 w-px" style={{ background: "#D8A0A0" }} />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>মাসিক জমা ও খরচের হিসাব</h2>
          <div className="flex items-center gap-4 text-[11.5px]" style={{ color: C.label }}>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.ink }} /> জমা</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.gold }} /> খরচ</span>
          </div>
        </div>
        <div className="h-56 pl-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid vertical={false} stroke={C.border} />
              <XAxis dataKey="month" tick={{ fill: C.sub, fontSize: 12 }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: C.text, border: "none", borderRadius: 2, fontSize: 12 }} labelStyle={{ color: "#F3EFE2" }} itemStyle={{ color: "#F3EFE2" }} />
              <Bar dataKey="jonmo" fill={C.ink} radius={[2, 2, 0, 0]} />
              <Bar dataKey="khoroch" fill={C.gold} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row: Pie + Trend */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense by category — Pie */}
        <div className="rounded-sm border p-6 relative overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
          <div className="absolute left-[52px] top-0 bottom-0 w-px" style={{ background: "#D8A0A0" }} />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>ক্যাটাগরিভিত্তিক খরচ</h2>
            <span className="text-[11px]" style={{ color: C.sub }}>সম্পূর্ণ সময়</span>
          </div>
          <div className="h-60 pl-4">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[13px]" style={{ color: C.sub }}>এখনো কোনো খরচ নেই</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={0} label={(entry: any) => entry.value > 0 ? toBengaliNumber(entry.value) : ""} labelLine={false}>
                    {categoryData.map((entry: any, i: number) => <Cell key={`c-${i}`} fill={piePalette[i % piePalette.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: C.text, border: "none", borderRadius: 2, fontSize: 12 }} itemStyle={{ color: "#F3EFE2" }} formatter={(value) => [formatMoney(Number(value ?? 0)), ""]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: C.label }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Yearly donation trend — Line */}
        <div className="rounded-sm border p-6 relative overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
          <div className="absolute left-[52px] top-0 bottom-0 w-px" style={{ background: "#D8A0A0" }} />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>বছরভিত্তিক দানের ধারা</h2>
            <span className="text-[11px]" style={{ color: C.sub }}>গত ৫ বছর</span>
          </div>
          <div className="h-60 pl-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyData}>
                <CartesianGrid vertical={false} stroke={C.border} />
                <XAxis dataKey="year" tick={{ fill: C.sub, fontSize: 12 }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
<Tooltip contentStyle={{ background: C.text, border: "none", borderRadius: 2, fontSize: 12 }} labelStyle={{ color: "#F3EFE2" }} itemStyle={{ color: "#F3EFE2" }} formatter={(value) => [formatMoney(Number(value ?? 0)), "দান"]} />
                <Line type="monotone" dataKey="jonmo" stroke={C.ink} strokeWidth={2.5} dot={{ r: 4, fill: C.gold, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="mt-6 rounded-sm border overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>সাম্প্রতিক এন্ট্রি</h2>
          <Link href="/donations" className="text-[12.5px] font-medium underline underline-offset-2" style={{ color: C.ink }}>সব দেখুন</Link>
        </div>
        <div className="divide-y" style={{ borderColor: C.border }}>
          {recentEntries.length === 0 ? (
            <div className="px-6 py-8 text-center text-[13px]" style={{ color: C.sub }}>কোনো এন্ট্রি পাওয়া যাচ্ছে না</div>
          ) : (
            recentEntries.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between px-6 py-3.5 transition" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: (e.type === "in" ? C.ink : C.red) + "14" }}>
                    <Wallet size={14} strokeWidth={2} style={{ color: e.type === "in" ? C.ink : C.red }} />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-medium" style={{ color: C.text }}>{e.name}</p>
                    <p className="text-[11.5px]" style={{ color: C.sub }}>{e.id} · {e.date} · {e.method}</p>
                  </div>
                </div>
                <p className="text-[14px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: e.type === "in" ? C.ink : C.red }}>
                  {e.type === "in" ? "+" : "−"}{formatMoney(e.amount)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}

