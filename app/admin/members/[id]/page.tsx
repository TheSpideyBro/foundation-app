"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { Phone, MapPin, ArrowLeft, Download, Calendar, ExternalLink } from "lucide-react";
import { buildMemberLedger, formatMonth } from "@/lib/payment-ledger";

type Member = { id: string; name: string; phone?: string; address?: string; monthly_pledge?: number; status?: string; join_date?: string };
type Donation = { id: string; amount: number; date: string; method?: string; receipt_no?: string; donation_month?: string; donation_end_month?: string };
const statusLabel: Record<string, string> = { paid: "পরিশোধিত", partial: "আংশিক", due: "বকেয়া", overpaid: "অতিরিক্ত" };
const statusClass: Record<string, string> = { paid: "bg-emerald-100 text-emerald-700", partial: "bg-amber-100 text-amber-700", due: "bg-rose-100 text-rose-700", overpaid: "bg-blue-100 text-blue-700" };

export default function AdminMemberDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: m } = await supabase().from("members").select("*").eq("id", id).single();
        const { data: d } = await supabase().from("donations").select("id, amount, date, method, receipt_no, donation_month, donation_end_month").eq("member_id", id).order("date", { ascending: false });
        setMember(m as Member | null);
        setDonations((d || []) as Donation[]);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!member) return <div className="p-20 text-center">সদস্য পাওয়া যায়নি</div>;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const selectedStart = `${year}-01`;
  const selectedEnd = `${year}-12`;
  const ledgerStart = member.join_date && member.join_date.slice(0, 7) > selectedStart ? member.join_date.slice(0, 7) : selectedStart;
  const ledgerEnd = selectedEnd < currentMonth ? selectedEnd : currentMonth;
  const ledger = ledgerStart <= ledgerEnd ? buildMemberLedger(donations, Number(member.monthly_pledge) || 0, ledgerStart, ledgerEnd) : [];
  const totalExpected = ledger.reduce((sum, row) => sum + row.expected, 0);
  const totalPaid = ledger.reduce((sum, row) => sum + row.paid, 0);
  const totalDue = ledger.reduce((sum, row) => sum + row.remaining, 0);
  const lastPayment = donations[0];

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold"><ArrowLeft size={18} /> ফিরে যান</button>
      <div className="card-premium p-6 sm:p-8 bg-[#064E3B] text-white"><div className="flex flex-col md:flex-row md:items-center justify-between gap-5"><div className="flex items-center gap-5"><div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center text-3xl font-bold">{member.name?.[0]}</div><div><h1 className="text-2xl sm:text-3xl font-bold font-tiro">{member.name}</h1><div className="flex flex-wrap gap-4 mt-2 text-white/70 text-sm"><span className="flex items-center gap-1"><Phone size={14} /> {member.phone || "ফোন নেই"}</span>{member.address && <span className="flex items-center gap-1"><MapPin size={14} /> {member.address}</span>}</div></div></div><div><p className="text-white/60 text-xs font-bold">মাসিক অঙ্গীকার</p><p className="text-2xl font-bold">৳{Number(member.monthly_pledge || 0).toLocaleString("bn-BD")}</p></div></div></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">{[{ label: "মোট প্রত্যাশিত", value: totalExpected, color: "text-gray-900" }, { label: "মোট জমা", value: totalPaid, color: "text-emerald-600" }, { label: "মোট বকেয়া", value: totalDue, color: "text-rose-600" }, { label: "শেষ জমা", value: lastPayment ? Number(lastPayment.amount) : 0, color: "text-blue-600" }].map((card) => <div key={card.label} className="card-premium p-4 sm:p-6"><p className="text-xs text-gray-400 font-bold mb-2">{card.label}</p><p className={`text-xl sm:text-2xl font-bold ${card.color}`}>৳{card.value.toLocaleString("bn-BD")}</p>{card.label === "শেষ জমা" && lastPayment && <p className="text-[10px] text-gray-400 mt-1">{new Date(lastPayment.date).toLocaleDateString("bn-BD")}</p>}</div>)}</div>
      <div className="card-premium p-4 sm:p-8"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"><div><h2 className="text-xl font-bold font-tiro text-gray-900">Payment History ও Member Ledger</h2><p className="text-sm text-gray-400 mt-1">মাসভিত্তিক জমা ও বকেয়ার হিসাব</p></div><select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-sm">{[year - 1, year, year + 1].map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-gray-100 text-xs text-gray-400"><th className="py-3">মাস</th><th>প্রত্যাশিত</th><th>জমা</th><th>বাকি</th><th>স্ট্যাটাস</th><th>রসিদ</th></tr></thead><tbody>{ledger.map((row) => { const receipt = row.donations[0]; return <tr key={row.month} className="border-b border-gray-50 text-sm"><td className="py-4 font-bold text-gray-800"><Calendar size={14} className="inline mr-2 text-emerald-600" />{formatMonth(row.month)}</td><td>৳{row.expected.toLocaleString("bn-BD")}</td><td className="font-bold text-emerald-600">৳{row.paid.toLocaleString("bn-BD")}</td><td className="font-bold text-rose-600">৳{row.remaining.toLocaleString("bn-BD")}</td><td><span className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass[row.status]}`}>{statusLabel[row.status]}</span></td><td>{receipt ? <a href={`/api/receipts/${receipt.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs"><ExternalLink size={13} /> দেখুন</a> : <span className="text-gray-300">—</span>}</td></tr>; })}</tbody></table></div></div>
      <div className="card-premium p-4 sm:p-8"><h2 className="text-lg font-bold font-tiro mb-4">সাম্প্রতিক payment records</h2><div className="space-y-3">{donations.slice(0, 8).map((donation) => <div key={donation.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-4"><div><p className="font-bold text-gray-800">{donation.receipt_no || "রসিদ নম্বর নেই"}</p><p className="text-xs text-gray-400">{new Date(donation.date).toLocaleDateString("bn-BD")} · {donation.method || "cash"}</p></div><div className="flex items-center gap-3"><span className="font-bold text-emerald-600">৳{Number(donation.amount).toLocaleString("bn-BD")}</span><a href={`/api/receipts/${donation.id}?download=1`} className="text-gray-500 hover:text-emerald-600" title="Download"><Download size={16} /></a></div></div>)}{donations.length === 0 && <p className="text-gray-400 text-sm">কোনো payment history পাওয়া যায়নি।</p>}</div></div>
    </div>
  );
}
