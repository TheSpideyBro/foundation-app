"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Calendar, Download, FileText, Filter, RefreshCw, Search, Wallet } from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { donationMonths, type LedgerDonation } from "@/lib/payment-ledger";

type Period = "monthly" | "yearly" | "total";
type Row = Record<string, any>;
type ReportStats = { target: number; collected: number; due: number; expense: number; members: number; balance: number; rate: number };
type CollectorRow = Row & { id: string; name: string; role: string; count: number; amount: number };

const money = (value: number) => `৳${Math.round(value || 0).toLocaleString("bn-BD")}`;
const monthLabel = (value: string) => new Date(`${value}-01T00:00:00`).toLocaleDateString("bn-BD", { month: "short", year: "numeric" });

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = useState("donations");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyRows, setMonthlyRows] = useState<Row[]>([]);
  const [donations, setDonations] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [members, setMembers] = useState<Row[]>([]);
  const [collectors, setCollectors] = useState<Row[]>([]);

  useEffect(() => { fetchReportData(); }, []);

  async function fetchReportData() {
    setLoading(true); setError(null);
    try {
      const [{ data: summary, error: summaryError }, { data: donationData, error: donationError }, { data: expenseData, error: expenseError }, { data: memberData, error: memberError }, { data: collectorData }] = await Promise.all([
        supabase().from("monthly_collection_summary").select("month, target_amount, collected_amount, due_amount, collection_rate, active_members, expense_amount, net_balance").order("month", { ascending: true }),
        supabase().from("donations").select("id, member_id, amount, date, donation_month, donation_end_month, receipt_no, method, collected_by, members(name, phone)").order("date", { ascending: false }),
        supabase().from("expenses").select("id, amount, date, category, description").order("date", { ascending: false }),
        supabase().from("members").select("id, name, phone, status, monthly_pledge, join_date").order("name"),
        supabase().from("users").select("id, name, role").in("role", ["admin", "treasurer"]),
      ]);
      if (summaryError || donationError || expenseError || memberError) throw summaryError || donationError || expenseError || memberError;
      setMonthlyRows(summary || []); setDonations(donationData || []); setExpenses(expenseData || []); setMembers(memberData || []); setCollectors(collectorData || []);
    } catch (err) { setError(err instanceof Error ? err.message : "রিপোর্ট লোড করা যায়নি"); }
    finally { setLoading(false); }
  }

  const periodRows = useMemo(() => {
    if (period === "monthly") return monthlyRows.filter((r) => r.month.slice(0, 7) === selectedMonth);
    if (period === "yearly") return monthlyRows.filter((r) => r.month.slice(0, 4) === selectedYear);
    return monthlyRows;
  }, [monthlyRows, period, selectedMonth, selectedYear]);

  const periodStart = period === "monthly" ? `${selectedMonth}-01` : period === "yearly" ? `${selectedYear}-01-01` : "0000-01-01";
  const periodEnd = period === "monthly" ? `${selectedMonth}-31` : period === "yearly" ? `${selectedYear}-12-31` : "9999-12-31";
  const inPeriod = (date?: string) => !date || (date >= periodStart && date <= periodEnd);
  const stats = useMemo<ReportStats>(() => {
    const summary = periodRows.reduce((a, r) => ({ target: a.target + Number(r.target_amount || 0), collected: a.collected + Number(r.collected_amount || 0), due: a.due + Number(r.due_amount || 0), expense: a.expense + Number(r.expense_amount || 0), members: Math.max(a.members, Number(r.active_members || 0)) }), { target: 0, collected: 0, due: 0, expense: 0, members: 0 });
    const filteredExpenses = expenses.filter((e) => inPeriod(e.date));
    const filteredDonations = donations.filter((d) => inPeriod(d.date));
    const coverageCollected = periodRows.reduce((a, r) => a + Number(r.collected_amount || 0), 0);
    const cashCollected = filteredDonations.reduce((a, d) => a + Number(d.amount || 0), 0);
    summary.collected = cashCollected;
    summary.expense = filteredExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
    if (period === "total") {
      summary.collected = donations.reduce((a, d) => a + Number(d.amount || 0), 0);
      summary.expense = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);
    }
    summary.due = Math.max(0, summary.target - coverageCollected);
    return { target: summary.target, collected: summary.collected, due: summary.due, expense: summary.expense, members: summary.members, balance: summary.collected - summary.expense, rate: summary.target ? Math.round((coverageCollected / summary.target) * 100) : 0 };
  }, [periodRows, donations, expenses, period, periodStart, periodEnd]);

  const filteredDonations = donations.filter((d) => inPeriod(d.date) && `${d.members?.name || ""} ${d.receipt_no || ""} ${d.method || ""}`.toLowerCase().includes(search.toLowerCase()));
  const filteredExpenses = expenses.filter((e) => inPeriod(e.date) && `${e.category || ""} ${e.description || ""}`.toLowerCase().includes(search.toLowerCase()));
  const filteredMembers = members.filter((m) => `${m.name} ${m.phone}`.toLowerCase().includes(search.toLowerCase()));
  const collectorRows: CollectorRow[] = collectors.map((c) => ({ ...c, id: String(c.id), name: String(c.name || "অজানা"), role: String(c.role || ""), count: donations.filter((d) => d.collected_by === c.id && inPeriod(d.date)).length, amount: donations.filter((d) => d.collected_by === c.id && inPeriod(d.date)).reduce((a, d) => a + Number(d.amount || 0), 0) })).filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()));
  const chartRows = period === "yearly" || period === "total" ? periodRows : periodRows.length ? periodRows : monthlyRows.slice(-1);
  const paidMemberRows = useMemo(() => {
    const covered = donations.filter((donation) => {
      const months = donationMonths(donation as LedgerDonation);
      return period === "monthly" ? months.includes(selectedMonth) : period === "yearly" ? months.some((month) => month.startsWith(selectedYear)) : months.length > 0;
    });
    const unique = new Map<string, Row>();
    covered.forEach((donation) => { const memberId = String(donation.member_id); if (!unique.has(memberId)) unique.set(memberId, donation.members || { id: memberId, name: "অজ্ঞাত সদস্য" }); });
    return Array.from(unique.values()).filter((member) => !search || String(member.name || "").toLowerCase().includes(search.toLowerCase())).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "bn"));
  }, [donations, period, selectedMonth, selectedYear, search]);

  function exportExcel() {
    const rows = activeTab === "paid-members" ? paidMemberRows.map((m) => ({ name: m.name })) : activeTab === "donations" ? filteredDonations.map((d) => ({ receipt: d.receipt_no, member: d.members?.name, amount: d.amount, date: d.date, month: d.donation_month, method: d.method })) : activeTab === "expenses" ? filteredExpenses.map((e) => ({ date: e.date, category: e.category, description: e.description, amount: e.amount })) : activeTab === "members" ? filteredMembers.map((m) => ({ name: m.name, phone: m.phone, status: m.status, monthly_pledge: m.monthly_pledge })) : collectorRows.map((r) => ({ name: r.name, role: r.role, count: r.count, amount: r.amount }));
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), activeTab); XLSX.writeFile(workbook, `foundation-report-${period}-${activeTab}.xlsx`);
  }

  function exportPdf() {
    const doc = new jsPDF(); doc.setFontSize(16); doc.text(`Foundation Report - ${period} - ${activeTab}`, 14, 18); doc.setFontSize(11); doc.text(`Collected: ${money(stats.collected)}   Expense: ${money(stats.expense)}   Balance: ${money(stats.balance)}`, 14, 28);
    const rows = activeTab === "paid-members" ? paidMemberRows : activeTab === "donations" ? filteredDonations : activeTab === "expenses" ? filteredExpenses : activeTab === "members" ? filteredMembers : collectorRows;
    rows.slice(0, 35).forEach((row, index) => doc.text(`${index + 1}. ${String(row.name || row.description || row.receipt_no || row.date || "")}  ${money(Number(row.amount || row.monthly_pledge || 0))}`, 14, 40 + index * 6)); doc.save(`foundation-report-${period}-${activeTab}.pdf`);
  }

  function exportCsv() {
    const rows = activeTab === "paid-members" ? paidMemberRows.map((m) => [m.name]) : activeTab === "donations" ? filteredDonations.map((d) => [d.receipt_no, d.members?.name, d.amount, d.date, d.donation_month, d.method]) : activeTab === "expenses" ? filteredExpenses.map((e) => [e.date, e.category, e.description, e.amount]) : activeTab === "members" ? filteredMembers.map((m) => [m.name, m.phone, m.status, m.monthly_pledge]) : collectorRows.map((r) => [r.name, r.role, r.count, r.amount]);
    const csv = rows.map((row) => row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `foundation-report-${period}-${activeTab}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="animate-spin text-emerald-600" /></div>;
  return <div className="space-y-6 pb-12">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-gray-900 font-tiro">আর্থিক প্রতিবেদন</h1><p className="text-gray-500 mt-1">সময়কাল নির্বাচন করে বিস্তারিত হিসাব দেখুন।</p></div><div className="flex gap-2"><button onClick={fetchReportData} className="btn-outline"><RefreshCw size={17} /> রিফ্রেশ</button><button onClick={exportCsv} className="btn-emerald"><Download size={17} /> CSV</button><button onClick={exportExcel} className="btn-outline">Excel</button><button onClick={exportPdf} className="btn-outline">PDF</button></div></div>
    {error && <div className="p-4 rounded-2xl bg-rose-50 text-rose-700">{error}</div>}
    <div className="card-premium p-4 flex flex-wrap items-center gap-2"><div className="flex bg-gray-100 p-1 rounded-xl">{([['monthly','মাসিক'],['yearly','বাৎসরিক'],['total','সর্বমোট']] as const).map(([key, label]) => <button key={key} onClick={() => setPeriod(key)} className={`px-4 py-2 rounded-lg text-sm font-bold ${period === key ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"}`}>{label}</button>)}</div>{period === "monthly" ? <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 font-bold" /> : period === "yearly" ? <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 font-bold">{Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - i)).map((year) => <option key={year}>{year}</option>)}</select> : <span className="text-sm font-bold text-gray-500">Foundation শুরু থেকে বর্তমান</span>}</div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{[["সংগ্রহ", stats.collected, "text-emerald-600"],["ব্যয়", stats.expense, "text-rose-600"],["নেট ব্যালেন্স", stats.balance, "text-blue-600"],["বকেয়া", stats.due, "text-amber-600"],["সংগ্রহের হার", stats.rate, "text-violet-600"]].map(([label, value, color]) => <div key={String(label)} className="card-premium p-5"><p className="text-xs font-bold text-gray-400 mb-2">{label}</p><p className={`text-2xl font-black ${color}`}>{label === "সংগ্রহের হার" ? `${value}%` : money(Number(value))}</p></div>)}</div>
    <div className="card-premium p-6"><div className="flex items-center gap-2 mb-5"><BarChart3 className="text-emerald-600" /><div><h2 className="font-bold text-gray-900">সংগ্রহ বনাম লক্ষ্য</h2><p className="text-xs text-gray-400">নির্বাচিত সময়কালের month-wise collection</p></div></div><div className="space-y-3">{chartRows.map((row) => <div key={row.month}><div className="flex justify-between text-xs font-bold mb-1"><span>{monthLabel(row.month.slice(0, 7))}</span><span>{money(Number(row.collected_amount))} / {money(Number(row.target_amount))}</span></div><div className="h-3 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Number(row.target_amount) ? Number(row.collected_amount) / Number(row.target_amount) * 100 : 0)}%` }} /></div></div>)}</div></div>
    <div className="card-premium overflow-hidden"><div className="p-5 flex flex-col md:flex-row gap-3 justify-between"><div className="flex flex-wrap gap-2">{[["donations","জমা"],["expenses","ব্যয়"],["members","সদস্য"],["collectors","আদায়কারী"],["paid-members","এই মাসে যারা দিয়েছেন"]].map(([key, label]) => <button key={key} onClick={() => setActiveTab(key)} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === key ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>{label}</button>)}</div><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm" /></div></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-500"><tr>{activeTab === "paid-members" ? <><th>সদস্যের নাম</th></> : activeTab === "donations" ? <><th>রসিদ</th><th>সদস্য</th><th>তারিখ</th><th>মাস</th><th>পদ্ধতি</th><th className="text-right">পরিমাণ</th></> : activeTab === "expenses" ? <><th>তারিখ</th><th>খাত</th><th>বিবরণ</th><th className="text-right">পরিমাণ</th></> : activeTab === "members" ? <><th>সদস্য</th><th>ফোন</th><th>স্ট্যাটাস</th><th className="text-right">মাসিক pledge</th></> : <><th>নাম</th><th>Role</th><th className="text-right">জমা সংখ্যা</th><th className="text-right">মোট সংগ্রহ</th></>}</tr></thead><tbody>{activeTab === "paid-members" ? paidMemberRows.map((m) => <tr key={m.id || m.name} className="border-t border-gray-100"><td className="p-3 font-bold">{m.name}</td></tr>) : activeTab === "donations" ? filteredDonations.map((d) => <tr key={d.id} className="border-t border-gray-100"><td className="p-3 font-bold">#{d.receipt_no}</td><td className="p-3">{d.members?.name || "—"}</td><td className="p-3">{d.date}</td><td className="p-3">{d.donation_month}{d.donation_end_month && ` – ${d.donation_end_month}`}</td><td className="p-3">{d.method}</td><td className="p-3 text-right font-bold">{money(Number(d.amount))}</td></tr>) : activeTab === "expenses" ? filteredExpenses.map((e) => <tr key={e.id} className="border-t border-gray-100"><td className="p-3">{e.date}</td><td className="p-3">{e.category || "অন্যান্য"}</td><td className="p-3">{e.description || "—"}</td><td className="p-3 text-right font-bold">{money(Number(e.amount))}</td></tr>) : activeTab === "members" ? filteredMembers.map((m) => <tr key={m.id} className="border-t border-gray-100"><td className="p-3 font-bold">{m.name}</td><td className="p-3">{m.phone || "—"}</td><td className="p-3">{m.status}</td><td className="p-3 text-right">{money(Number(m.monthly_pledge))}</td></tr>) : collectorRows.map((r) => <tr key={r.id} className="border-t border-gray-100"><td className="p-3 font-bold">{r.name}</td><td className="p-3">{r.role}</td><td className="p-3 text-right">{r.count}</td><td className="p-3 text-right font-bold">{money(r.amount)}</td></tr>)}</tbody></table>{((activeTab === "paid-members" && !paidMemberRows.length) || (activeTab === "donations" && !filteredDonations.length) || (activeTab === "expenses" && !filteredExpenses.length) || (activeTab === "members" && !filteredMembers.length) || (activeTab === "collectors" && !collectorRows.length)) && <div className="p-10 text-center text-gray-400">কোনো তথ্য পাওয়া যায়নি</div>}</div></div>
  </div>;
}
