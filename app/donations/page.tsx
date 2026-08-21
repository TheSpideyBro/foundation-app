"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { logAudit } from "@/lib/audit";
import { triggerSheetsSync } from "@/lib/sheets-auto";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { Search, Filter, Plus, X, Download, Trash2, CheckCircle2, Stamp } from "lucide-react";
import { toPng, toJpeg } from "html-to-image";
import { formatMoney, formatDateBengali, methodLabels, bengaliMonths, toBengaliNumber, numberToWordsBengali, monthLabelBengali } from "@/lib/utils";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

const methodOptions = [
  { value: "cash", label: "ক্যাশ" },
  { value: "bkash", label: "বিকাশ" },
  { value: "nagad", label: "নগদ" },
  { value: "bank", label: "ব্যাংক" },
];

/* ============================================================
   Premium Receipt — inspired by receipt_mobile_v2.html demo
   Ticket style: paper card, teal+brass palette, serrated
   notches, Tiro Bangla headings, amount in words + figure box.
============================================================ */
const RC = {
  tealDeep: "#0F3D33",
  tealMid: "#1B5A4B",
  brass: "#C9A227",
  brassSoft: "#E4C766",
  paper: "#FAF6EC",
  ink: "#1C1B17",
  inkSoft: "#5B5A52",
  line: "#DCD3BC",
};

const ORG_NAME = "দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযূল ফাউন্ডেশন";

function ReceiptCard({ receiptNo, donorName, amount, date, method, receivedBy, monthLabel, orgName }: {
  receiptNo: string; donorName: string; amount: number; date: string; method: string;
  receivedBy: string; monthLabel: string; orgName?: string;
}) {
  const amountWords = numberToWordsBengali(amount);
  return (
    <div
      id="receipt-card"
      className="w-[380px] relative overflow-hidden"
      style={{ background: RC.paper, fontFamily: "'Hind Siliguri', sans-serif", borderRadius: 18, boxShadow: "0 24px 48px -16px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.05)" }}
    >
      {/* Faint pinstripe texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 36px, rgba(15,61,51,.035) 36px 38px)" }}
      />

      {/* Brand row */}
      <div className="flex items-center gap-3 relative" style={{ padding: "20px 20px 0" }}>
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 56, height: 56, borderRadius: "50%", background: RC.paper, boxShadow: "0 3px 8px rgba(0,0,0,.3)" }}
        >
          <Stamp size={26} strokeWidth={1.75} style={{ color: RC.tealDeep }} />
        </div>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-[1.28]" style={{ fontFamily: "'Tiro Bangla', serif", color: RC.tealDeep, margin: 0 }}>{orgName || ORG_NAME}</p>
          <p className="text-[9.5px] tracking-[0.1em] uppercase mt-0.5" style={{ color: RC.brass, fontWeight: 700 }}>Donation Receipt · দান রসিদ</p>
        </div>
      </div>

      {/* Org info strip */}
      <div
        className="relative mt-[9px] mx-5 rounded-r-lg"
        style={{ padding: "8px 10px", background: "rgba(15,61,51,.05)", borderLeft: "2.5px solid " + RC.brass, fontSize: 9.8, lineHeight: 1.55, color: RC.inkSoft }}
      >
        <b style={{ color: RC.tealDeep, fontWeight: 700 }}>প্রতিষ্ঠিত:</b> ০৬/১০/২০১০ তারিখ, দৌলখাঁড় পূর্বপাড়া, বাঙ্গলাবাজার, কুমিল্লা |
        <b style={{ color: RC.tealDeep, fontWeight: 700 }}> যোগাযোগ:</b> ০১৮৭০-২৩৮৫৫৩, ০১৮৮৪-৯৪৫২২১
      </div>

      {/* Divider */}
      <div className="relative" style={{ borderTop: `2px solid ${RC.tealDeep}`, margin: "14px 20px 0" }} />

      {/* Tag row */}
      <div className="flex items-center justify-between relative" style={{ padding: "14px 20px 0" }}>
        <span className="text-[9.5px] tracking-[0.12em] uppercase text-white px-2.5 py-1 rounded-full" style={{ background: RC.tealDeep }}>Donor</span>
        <span className="text-[15px]" style={{ fontFamily: "'Tiro Bangla', serif", color: RC.brass }}>{orgName ? "অনুদানের রসিদ" : "অনুদানের রসিদ"}</span>
      </div>

      {/* Fields */}
      <div className="relative" style={{ padding: "14px 20px 0" }}>
        <Field label={`রসিদ নং ${toBengaliNumber(receiptNo)}`} />
        <Field label={`তারিখ: ${date}`} />
        <Field label={`দাতা / অবদানকারী: ${donorName || "—"}`} />
        <Field label={`দানের মাস: ${monthLabel}`} />
        <Field label={`টাকার পরিমাণ কথায়: ${amountWords} টাকা মাত্র`} />

        {/* Amount figure box */}
        <div className="flex justify-end mt-3">
          <div className="flex items-center gap-2 rounded-lg px-3.5 py-2.5" style={{ background: RC.tealDeep }}>
            <span className="text-[9.5px] tracking-[0.06em] uppercase" style={{ color: RC.brassSoft, fontWeight: 700 }}>পরিমাণ</span>
            <span className="text-[17px] font-bold" style={{ color: "#fff", fontFamily: "'Hind Siliguri', sans-serif" }}>{formatMoney(amount)}</span>
          </div>
        </div>

        {/* Method + received-by row */}
        <div className="flex items-center justify-between mt-3" style={{ fontSize: 12 }}>
          <span className="px-2.5 py-0.5 rounded-full inline-block text-[11.5px] font-medium" style={{ background: RC.brass + "1A", color: RC.brass }}>
            {methodLabels[method] || method}
          </span>
          <span style={{ color: RC.inkSoft }}>গ্রহণকারী: <b style={{ color: RC.tealDeep }}>{receivedBy}</b></span>
        </div>
      </div>

      {/* Signature + fine print */}
      <div className="flex items-end justify-between relative" style={{ padding: "18px 20px 16px" }}>
        <p style={{ fontSize: 9, color: RC.inkSoft, maxWidth: 190, lineHeight: 1.45 }}>
          এই রসিদটি ইলেকট্রনিকভাবে তৈরি করা হয়েছে এবং সংরক্ষণে নিয়া যাবে।
        </p>
        <div className="text-center" style={{ width: 120, flex: "0 0 auto" }}>
          <div style={{ borderTop: `1.2px solid ${RC.ink}`, marginBottom: 5 }} />
          <span style={{ fontSize: 9.5, color: RC.inkSoft, fontWeight: 600 }}>অনুমোদনকারীর স্বাক্ষর</span>
        </div>
      </div>

      {/* Serrated bottom notches */}
      <div className="absolute left-0 right-0 flex justify-between px-1.5 pointer-events-none" style={{ bottom: -6, height: 12 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, #16493c, #0b2a23)" }} />
        ))}
      </div>
    </div>
  );
}

function Field({ label }: { label: string }) {
  return (
    <p className="mb-[9px]" style={{ borderBottom: `1.4px solid ${RC.line}`, paddingBottom: 3, fontSize: 12.5, color: RC.ink, fontWeight: 500 }}>{label}</p>
  );
}

export default function DonationsPage() {
  const { user, role } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [formMemberId, setFormMemberId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formMethod, setFormMethod] = useState("cash");
  const [formReceivedBy, setFormReceivedBy] = useState("");
  const [formMonth, setFormMonth] = useState(new Date().toISOString().slice(0, 7));
  const [formMonths, setFormMonths] = useState(1); // how many months covered (1 = single, >1 = multi-month chada)
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Month options: current month + previous 12 months in English
  const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { value: key, label: `${englishMonths[d.getMonth()]} ${d.getFullYear()}` };
  });

  const selectedMemberPledge = Number(
    members.find((m) => m.id === formMemberId)?.monthly_pledge ?? 0
  ) || 0;

  const fetchData = async () => {
    if (!user) return;
    const { data: mems } = await supabase().from("members").select("*");
    setMembers(mems || []);

    const { data: dons } = await supabase()
      .from("donations")
      .select("*, members(name)")
      .order("created_at", { ascending: false });
    setDonations(dons || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formMemberId || !formAmount) return;
    // Migration-resilient: include donation_month only when the column exists
    // NOTE: must use a plain GET select (not HEAD) — PostgREST returns an empty
    // body for HEAD 400 errors, so the error message would be empty.
    const schemaCheck = await supabase().from("donations").select("donation_month").limit(1);
    const hasMonthCol = !(schemaCheck.error && String(schemaCheck.error.message).includes("donation_month"));
    // Multi-month chada support: split the payment into ONE ROW PER MONTH so the
    // dashboard donut counts (per-month donation_month) and the overdue list stay accurate.
    const amount = parseFloat(formAmount);
    const isChada = hasMonthCol && formMonth && formMonths >= 1;
    const rows: Record<string, unknown>[] = Array.from({ length: isChada ? formMonths : 1 }, (_, i) => {
      const d = new Date(formMonth + "-01");
      d.setMonth(d.getMonth() + i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        ...(isChada ? { donation_month: monthKey } : {}),
        member_id: formMemberId,
        amount: isChada ? Number((amount / formMonths).toFixed(2)) : amount,
        date: formDate,
        method: formMethod,
        received_by: formReceivedBy,
        created_by: user.id,
      };
    });
    const { error, data } = await supabase().from("donations").insert(rows);
    if (error) {
      alert("দান এন্ট্রি যোগ করা যায়নি: " + error.message);
      return;
    }
    logAudit("donation.insert", "donations", (data as unknown as any[] | null)?.[0]?.id, { amount, months: formMonths, method: formMethod, donor_id: formMemberId });
    triggerSheetsSync();
    setShowForm(false);
    setFormMemberId(""); setFormAmount(""); setFormReceivedBy("");
    setFormMonth(new Date().toISOString().slice(0, 7));
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই দান এন্ট্রি মুছতে চান?")) return;
    const { data: rows, error } = await supabase().from("donations").select("receipt_no, amount, member_id").eq("id", id);
    if (error) {
      alert("দান এন্ট্রি মুছা যায়নি: " + error.message);
      return;
    }
    logAudit("donation.delete", "donations", id, { receipt_no: rows?.[0]?.receipt_no, amount: rows?.[0]?.amount });
    triggerSheetsSync();
    fetchData();
  };

  const handleDownloadPNG = async () => {
    if (!receiptRef.current) return;
    const dataUrl = await toPng(receiptRef.current);
    const link = document.createElement("a");
    link.download = `${selectedDonation?.receipt_no}.png`;
    link.href = dataUrl;
    link.click();
  };


  const handleShareWhatsApp = () => {
    if (!selectedDonation) return;
    const text = encodeURIComponent(`দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন থেকে দান রসিদ: ${selectedDonation.receipt_no}, পরিমাণ: ৳${selectedDonation.amount}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleShareWeb = async () => {
    if (!receiptRef.current || !selectedDonation) return;
    try {
      const dataUrl = await toJpeg(receiptRef.current, { quality: 0.95 });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${selectedDonation.receipt_no}.jpg`, { type: "image/jpeg" });
      await navigator.share({ files: [file], title: "দান রসিদ", text: `রসিদ: ${selectedDonation.receipt_no}` });
    } catch {
      // Fallback to WhatsApp
      handleShareWhatsApp();
    }
  };

  const filtered = donations.filter((d) => {
    const name = d.members?.name || "";
    return name.toLowerCase().includes(search.toLowerCase()) || d.receipt_no.includes(search);
  });

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[19px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>দান এন্ট্রি</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-sm hover:brightness-105 transition" style={{ background: C.gold, color: C.ink }}>
          <Plus size={15} strokeWidth={2.5} /> নতুন দান যোগ করুন
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-sm border px-3 py-2 mb-4" style={{ background: C.paper, borderColor: C.border }}>
        <Search size={15} style={{ color: C.sub }} />
        <input placeholder="সদস্যের নাম দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-[13px] outline-none flex-1" style={{ fontFamily: "'Hind Siliguri', sans-serif", color: C.text }} />
        <Filter size={14} style={{ color: C.sub }} />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-sm border overflow-hidden" style={{ background: C.paper, borderColor: C.border }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>নতুন দান</h2>
              <button onClick={() => setShowForm(false)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>সদস্য</label>
                <select required value={formMemberId} onChange={(e) => setFormMemberId(e.target.value)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none" style={{ background: "#fff", borderColor: C.border }}>
                  <option value="">সদস্য বাছাই করুন</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}{(m.monthly_pledge ?? 0) > 0 ? ` (মাসিক ৳${Number(m.monthly_pledge).toLocaleString()})` : ""}</option>)}
                </select>
                {selectedMemberPledge > 0 && (
                  <p className="text-[11.5px] mt-1.5" style={{ color: C.ink }}>এই সদস্য মাসে ৳{selectedMemberPledge.toLocaleString()} দানের প্রতিশ্রুতি দিয়েছেন</p>
                )}
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>পরিমাণ (৳)</label>
                <input type="number" min="1" step="0.01" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none" style={{ background: "#fff", borderColor: C.border }} />
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>তারিখ</label>
                <input type="date" required value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none" style={{ background: "#fff", borderColor: C.border }} />
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>শুরুর মাস</label>
                <select value={formMonth} onChange={(e) => setFormMonth(e.target.value)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none" style={{ background: "#fff", borderColor: C.border }}>
                  {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>কত মাস পরিশোধ</label>
                <select value={formMonths} onChange={(e) => setFormMonths(Number(e.target.value))} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none" style={{ background: "#fff", borderColor: C.border }}>
                  {[1, 2, 3, 4, 5, 6, 12].map((n) => <option key={n} value={n}>{n} মাস</option>)}
                </select>
                {selectedMemberPledge > 0 && Number(formAmount) > 0 && (
                  <div className="text-[11px] mt-1" style={{ color: C.sub }}>
                    প্রতি মাস ৳{selectedMemberPledge} — পরিশোধের পর প্রতি মাসের জন্য আলাদা এন্ট্রি হবে (মোট ৳{formMonths * selectedMemberPledge})
                  </div>
                )}
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>মাধ্যম</label>
                <select value={formMethod} onChange={(e) => setFormMethod(e.target.value)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none" style={{ background: "#fff", borderColor: C.border }}>
                  {methodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>গ্রহণকারী</label>
                <input value={formReceivedBy} onChange={(e) => setFormReceivedBy(e.target.value)} placeholder="যিনি পেয়েছেন" className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none" style={{ background: "#fff", borderColor: C.border }} />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-sm text-[13.5px] font-semibold transition hover:brightness-105" style={{ background: C.gold, color: C.ink }}>যোগ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Donation List */}
      {loading ? (
        <div className="text-center py-12" style={{ color: C.sub }}>লোড হচ্ছে...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-sm border" style={{ background: C.paper, borderColor: C.border, color: C.sub }}>কোনো দান নেই</div>
      ) : (
        <div className="rounded-sm border overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 text-[11px] uppercase tracking-wide font-medium" style={{ fontFamily: "'Hind Siliguri', sans-serif", color: C.label, borderBottom: `1px solid ${C.border}` }}>
            <span>সদস্য</span><span>মাধ্যম</span><span>তারিখ</span><span className="text-right">পরিমাণ</span>
          </div>
          <div className="divide-y" style={{ borderColor: C.border }}>
            {filtered.map((d) => (
              <div key={d.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-3.5">
                <div>
                  <p className="text-[13.5px] font-medium" style={{ color: C.text }}>{d.members?.name || "অজানা"}</p>
                  <p className="text-[11px]" style={{ color: C.sub }}>{d.receipt_no}</p>
                </div>
                <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: C.gold + "1A", color: C.gold }}>{methodLabels[d.method] || d.method}</span>
                <span className="text-[12.5px]" style={{ color: C.sub }}>{formatDateBengali(d.date)}</span>
                <div className="flex items-center gap-3 justify-end">
                  <span className="text-[14px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.ink }}>{formatMoney(d.amount)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => { setSelectedDonation(d); setShowReceipt(true); }} className="p-1.5 rounded-sm hover:brightness-95" style={{ background: C.ink + "14" }} title="রসিদ দেখুন">
                      <Download size={13} style={{ color: C.ink }} />
                    </button>
                    <a href={`/api/receipts/${d.id}`} target="_blank" className="p-1.5 rounded-sm hover:brightness-95 flex items-center gap-0.5" style={{ background: "#A63D4014" }} title="PDF ডাউনলোড">
                      <Download size={13} style={{ color: "#A63D40" }} />
                      <span className="text-[9px] font-bold" style={{ color: "#A63D40" }}>PDF</span>
                    </a>
                  </div>
                  {role === "admin" && <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-sm hover:brightness-95" style={{ background: C.red + "14" }}>
                    <Trash2 size={13} style={{ color: C.red }} />
                  </button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && selectedDonation && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowReceipt(false)}>
          <div className="flex flex-col items-center gap-4 py-8" onClick={(e) => e.stopPropagation()}>
            <div ref={receiptRef}>
              <ReceiptCard
                receiptNo={selectedDonation.receipt_no}
                donorName={selectedDonation.members?.name || ""}
                amount={selectedDonation.amount}
                date={formatDateBengali(selectedDonation.date)}
                method={selectedDonation.method}
                receivedBy={selectedDonation.received_by || "কোষাধ্যক্ষ"}
                monthLabel={monthLabelBengali(selectedDonation.donation_month || selectedDonation.date)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleDownloadPNG} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-sm transition hover:brightness-105" style={{ background: C.ink, color: "#F3EFE2" }}>
                <Download size={14} /> PNG ডাউনলোড
              </button>
              <button onClick={handleShareWeb} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-sm transition hover:brightness-105" style={{ background: "#25D366", color: "#fff" }}>
                <Download size={14} /> শেয়ার
              </button>
              <button onClick={() => setShowReceipt(false)} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-sm transition hover:brightness-105" style={{ background: C.sub, color: "#fff" }}>
                <X size={14} /> বন্ধ
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
