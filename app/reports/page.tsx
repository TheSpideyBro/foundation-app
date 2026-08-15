"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { Wallet, ArrowUpCircle, Users, Download, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { formatMoney, bengaliMonths, toBengaliNumber } from "@/lib/utils";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
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

export default function ReportsPage() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [totalDon, setTotalDon] = useState(0);
  const [totalExp, setTotalExp] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rawDonations, setRawDonations] = useState<any[]>([]);
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [rawMembers, setRawMembers] = useState<any[]>([]);
  const [pdfYear, setPdfYear] = useState(new Date().getFullYear());
  const [pdfLoading, setPdfLoading] = useState(false);
  const summaryCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // user undefined = auth still initializing; user null = resolved, no session
    if (user === undefined) return;
    if (!user) { setLoading(false); return; }
    async function fetchData() {
      try {
        const { data: donations } = await supabase().from("donations").select("*");
        const { data: expenses } = await supabase().from("expenses").select("*");
        const { data: members } = await supabase().from("members").select("*").eq("status", "active");

        setRawDonations(donations || []);
        setRawExpenses(expenses || []);
        setRawMembers(members || []);

        const totalDon = donations?.reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0;
        const totalExp = expenses?.reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0;
        setTotalDon(totalDon);
        setTotalExp(totalExp);
        setActiveMembers(members?.length || 0);

        // Build monthly summary
        const monthMap: Record<string, { jonmo: number; khoroch: number }> = {};
        for (let i = 0; i < 12; i++) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthMap[key] = { jonmo: 0, khoroch: 0 };
        }

        donations?.forEach((don: any) => {
          const key = don.date.slice(0, 7);
          if (monthMap[key]) monthMap[key].jonmo += don.amount;
        });
        expenses?.forEach((exp: any) => {
          const key = exp.date.slice(0, 7);
          if (monthMap[key]) monthMap[key].khoroch += exp.amount;
        });

        const chartData = Object.entries(monthMap)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([key, vals]) => {
            const [year, month] = key.split("-");
            return {
              month: bengaliMonths[parseInt(month) - 1],
              year: parseInt(year),
              jonmo: vals.jonmo,
              khoroch: vals.khoroch,
              nit: vals.jonmo - vals.khoroch,
            };
          });
        setMonthlyData(chartData);
      } catch (err) {
        console.error("Reports fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => {
      // If the effect is cleaned up before the fetch finishes (e.g. the user
      // just signed out), clear the spinner so the page doesn't hang.
      setLoading(false);
    };
  }, [user]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(monthlyData.map(m => ({
      মাস: `${m.month} ${toBengaliNumber(m.year)}`,
      জমো: m.jonmo,
      খরচ: m.khoroch,
      নিট: m.nit,
    })));
    XLSX.utils.book_append_sheet(wb, ws1, "মাসিক সারাংশ");

    // Member-wise donations
    const donorMap: Record<string, { name: string; total: number; count: number }> = {};
    rawDonations.forEach((d: any) => {
      const name = d.members?.name || "অজানা";
      const entry = donorMap[name] || { name, total: 0, count: 0 };
      entry.total += d.amount || 0;
      entry.count += 1;
      donorMap[name] = entry;
    });
    const ws2 = XLSX.utils.json_to_sheet(Object.values(donorMap).map((m: any) => ({
      "সদস্যের নাম": m.name,
      "মোট দান": m.total,
      "দানের সংখ্যা": m.count,
    })));
    XLSX.utils.book_append_sheet(wb, ws2, "সদস্যভিত্তিক দান");

    // Category-wise expenses
    const catMap: Record<string, number> = {};
    rawExpenses.forEach((e: any) => {
      const c = e.category || "অন্যান্য";
      catMap[c] = (catMap[c] || 0) + (e.amount || 0);
    });
    const ws3 = XLSX.utils.json_to_sheet(Object.entries(catMap).map(([c, v]) => ({
      "ক্যাটেগরি": c,
      "মোট খরচ": v,
    })));
    XLSX.utils.book_append_sheet(wb, ws3, "ক্যাটেগরিভিত্তিক খরচ");

    XLSX.writeFile(wb, `রিপোর্ট_${new Date().getFullYear()}.xlsx`);
  };

  // Annual PDF report: renders a hidden Bengali summary, snapshots it as PNG,
  // slices it into A4-height pages via canvas cropping, and embeds in a PDF
  const exportAnnualPdf = async () => {
    setPdfLoading(true);
    try {
      if (!summaryCardRef.current) return;
      const pngDataUrl = await toPng(summaryCardRef.current, { pixelRatio: 2, backgroundColor: "#FBF8F1" });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = pngDataUrl;
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 10;
      const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
      const availH = pdf.internal.pageSize.getHeight() - margin * 2;
      const imgW = pageW;
      const imgH = (imgW * img.height) / img.width;

      // Crop the long image into A4-height slices on a canvas
      const canvas = document.createElement("canvas");
      const scale = 2;
      const slicePxH = Math.floor((availH / imgH) * img.height);
      const slicePxW = img.width;
      canvas.width = slicePxW;
      canvas.height = slicePxH;
      const ctx = canvas.getContext("2d")!;
      let offset = 0;
      let first = true;
      while (offset < img.height) {
        const h = Math.min(slicePxH, img.height - offset);
        ctx.clearRect(0, 0, slicePxW, slicePxH);
        ctx.drawImage(img, 0, offset, slicePxW, h, 0, 0, slicePxW, h);
        if (!first) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, imgW, (imgW * h) / slicePxW, undefined, "FAST");
        first = false;
        offset += slicePxH;
      }
      pdf.save(`বার্ষিক রিপোর্ট_${toBengaliNumber(String(pdfYear))}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      alert("PDF তৈরি হয়নি: " + (err as Error).message);
    } finally {
      setPdfLoading(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Year-filtered aggregates for the PDF card
  const yearDonations = rawDonations.filter((d: any) => String(d.date).startsWith(String(pdfYear)));
  const yearExpenses = rawExpenses.filter((e: any) => String(e.date).startsWith(String(pdfYear)));
  const yearDonTotal = yearDonations.reduce((s, d) => s + (d.amount || 0), 0);
  const yearExpTotal = yearExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20" style={{ color: C.sub }}>ডেটা লোড হচ্ছে...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[19px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>রিপোর্ট</h1>
        <div className="flex items-center gap-2">
          <select value={pdfYear} onChange={(e) => setPdfYear(parseInt(e.target.value))} className="rounded-sm border px-3 py-2 text-[13px] outline-none" style={{ background: C.paper, borderColor: C.border, color: C.text }}>
            {yearOptions.map((y) => <option key={y} value={y}>{toBengaliNumber(String(y))}</option>)}
          </select>
          <button onClick={exportAnnualPdf} disabled={pdfLoading} className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-sm hover:brightness-105 transition disabled:opacity-60" style={{ background: C.ink, color: "#F3EFE2" }}>
            <FileText size={15} strokeWidth={2.5} /> {pdfLoading ? "তৈরি হচ্ছে..." : "বার্ষিক PDF রিপোর্ট"}
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-sm hover:brightness-105 transition" style={{ background: C.gold, color: C.ink }}>
            <FileSpreadsheet size={15} strokeWidth={2.5} /> এক্সেল এক্সপোর্ট
          </button>
        </div>
      </div>

      <p className="text-[11.5px] mb-4 -mt-2" style={{ color: C.sub }}>
        এক্সেল ফাইলে ৩টি শিট আছে: মাসিক সারাংশ, সদস্যভিত্তিক দান ও ক্যাটেগরিভিত্তিক খরচ — সবসময় তাজা ডেটা পাবেন।
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stub icon={Wallet} label="সর্বমোট জমা" value={totalDon} accent={C.ink} />
        <Stub icon={ArrowUpCircle} label="সর্বমোট খরচ" value={totalExp} accent={C.red} />
        <Stub icon={Users} label="সক্রিয় সদস্য" value={activeMembers} sub="মোট নিবন্ধিত" accent={C.gold} />
      </div>

      <div className="rounded-sm border overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
        <div className="px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>মাসিক সারাংশ</h2>
        </div>
        <div className="grid grid-cols-4 gap-4 px-6 py-3 text-[11px] uppercase tracking-wide font-medium" style={{ fontFamily: "'Hind Siliguri', sans-serif", color: C.label, borderBottom: `1px solid ${C.border}` }}>
          <span>মাস</span><span>জমো</span><span>খরচ</span><span className="text-right">নিট</span>
        </div>
        <div className="divide-y" style={{ borderColor: C.border }}>
          {monthlyData.map((m) => (
            <div key={`${m.year}-${m.month}`} className="grid grid-cols-4 gap-4 px-6 py-3">
              <span className="text-[13px]" style={{ color: C.text }}>{m.month} {toBengaliNumber(m.year)}</span>
              <span className="text-[13px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.ink }}>{formatMoney(m.jonmo)}</span>
              <span className="text-[13px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.red }}>{formatMoney(m.khoroch)}</span>
              <span className="text-[13px] text-right font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.text }}>{formatMoney(m.nit)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden printable summary card for the annual PDF */}
      <div style={{ position: "absolute", left: -9999, top: 0, zIndex: -1 }} aria-hidden>
        <div ref={summaryCardRef} style={{ width: 600, background: "#FBF8F1", padding: 32, fontFamily: "'Hind Siliguri', sans-serif" }}>
          <div style={{ borderBottom: "3px solid #C9972D", paddingBottom: 16, marginBottom: 24 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#1B4332", margin: 0, fontFamily: "'Tiro Bangla', serif" }}>দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন</p>
            <p style={{ fontSize: 15, color: "#8A8371", margin: "4px 0 0" }}>বার্ষিক হিসাব রিপোর্ট — {toBengaliNumber(String(pdfYear))}</p>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, border: "1px solid #E4DCC8", borderRadius: 4, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, color: "#7A7364", margin: 0 }}>সর্বমোট জমো</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#1B4332", margin: "6px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>{formatMoney(yearDonTotal)}</p>
            </div>
            <div style={{ flex: 1, border: "1px solid #E4DCC8", borderRadius: 4, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, color: "#7A7364", margin: 0 }}>সর্বমোট খরচ</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#A63D40", margin: "6px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>{formatMoney(yearExpTotal)}</p>
            </div>
            <div style={{ flex: 1, border: "1px solid #E4DCC8", borderRadius: 4, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, color: "#7A7364", margin: 0 }}>নিট জমা</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#2B2B26", margin: "6px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>{formatMoney(yearDonTotal - yearExpTotal)}</p>
            </div>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1B4332", margin: "0 0 8px" }}>মাসিক সারাংশ</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E4DCC8" }}>
                {["মাস", "জমো", "খরচ", "নিট"].map(h => (
                  <th key={h} style={{ padding: "6px 8px", textAlign: h === "মাস" ? "left" : "right", color: "#7A7364", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyData.map(m => (
                <tr key={`${m.year}-${m.month}`} style={{ borderBottom: "1px solid #E4DCC8" }}>
                  <td style={{ padding: "5px 8px" }}>{m.month} {toBengaliNumber(m.year)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{formatMoney(m.jonmo)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#A63D40" }}>{formatMoney(m.khoroch)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{formatMoney(m.nit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "#8A8371", margin: "18px 0 0" }}>রিপোর্ট তৈরির তারিখ: {new Date().toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>
    </AppLayout>
  );
}
