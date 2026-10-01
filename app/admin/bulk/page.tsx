"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { todayISO, toBengaliNumber } from "@/lib/utils";
import {
  Download, Upload, FileText, ArrowLeft,
  Database, CheckCircle2, AlertTriangle,
  Loader2, ReceiptText, FileDown, X
} from "lucide-react";
import Link from "next/link";
import * as XLSX from '@e965/xlsx';
import { useAuth } from "@/components/providers";
import { isAdmin as hasAdminRole } from "@/lib/auth";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB — zip-bomb / ReDoS guard (H1)
const MAX_ROWS = 500;
const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

type Section = {
  id: string;
  title: string;
  icon: ReactNode;
  /** Exact column headers the import API accepts for this section. */
  headers: string[];
};

const SECTIONS: Section[] = [
  {
    id: "members",
    title: "সদস্য তালিকা",
    icon: <Database size={24} />,
    headers: ["name", "phone", "address", "join_date", "monthly_pledge", "status"],
  },
  {
    id: "donations",
    title: "অনুদান রিপোর্ট",
    icon: <FileText size={24} />,
    headers: ["member_id", "amount", "date", "method", "receipt_no", "donation_month", "extra_amount", "note"],
  },
  {
    id: "expenses",
    title: "খরচের হিসাব",
    icon: <ReceiptText size={24} />,
    headers: ["category", "amount", "date", "description", "proof_url"],
  },
];

type Preview = {
  section: Section;
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

type RowError = { row: number; error: string };

export default function BulkManagementPage() {
  const { role } = useAuth();
  const isAdmin = hasAdminRole(role);

  const [loading, setLoading] = useState(false);
  const [processingMsg, setProcessingMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);

  /** Client-side template: exact headers the API expects for the section. */
  const downloadTemplate = (section: Section) => {
    const ws = XLSX.utils.aoa_to_sheet([section.headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "template");
    XLSX.writeFile(wb, `${section.id}_template.xlsx`);
  };

  const exportData = async (section: Section) => {
    setLoading(true);
    setProcessingMsg("এক্সপোর্ট হচ্ছে…");
    try {
      const res = await fetch(`/api/admin/bulk?type=${section.id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
      if (!Array.isArray(data)) throw new Error("এক্সপোর্ট করার উপযুক্ত ডেটা পাওয়া যায়নি");

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, section.id);
      XLSX.writeFile(wb, `${section.id}_backup_${todayISO()}.xlsx`);

      setStatus({ type: "success", msg: `${section.title} সফলভাবে এক্সপোর্ট করা হয়েছে।` });
    } catch (err) {
      setStatus({ type: "error", msg: "এক্সপোর্ট করতে সমস্যা হয়েছে।" });
    } finally {
      setLoading(false);
      setProcessingMsg(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, section: Section) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus(null);
    setRowErrors([]);

    // 1) File validation before touching the parser.
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setStatus({ type: "error", msg: "শুধুমাত্র .xlsx, .xls বা .csv ফাইল গ্রহণযোগ্য।" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStatus({ type: "error", msg: "ফাইলটি ৫MB-এর বেশি হতে পারবে না।" });
      e.target.value = "";
      return;
    }

    setLoading(true);
    setProcessingMsg("ফাইল পড়া হচ্ছে…");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        let wb: XLSX.WorkBook;
        try {
          wb = XLSX.read(bstr, { type: "binary" });
        } catch {
          throw new Error("ফাইলটি পড়া যায়নি — সঠিক এক্সেল ফাইল দিন।");
        }
        const ws = wb.Sheets[wb.SheetNames[0]];
        const items = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        if (items.length === 0) throw new Error("ফাইলটি খালি।");
        if (items.length > MAX_ROWS) {
          throw new Error(`একবারে সর্বোচ্চ ${toBengaliNumber(MAX_ROWS)} সারি ইম্পোর্ট করা যাবে।`);
        }

        const headers = Object.keys(items[0] ?? {});
        setPreview({ section, fileName: file.name, headers, rows: items });
      } catch (err) {
        setStatus({
          type: "error",
          msg: "ইম্পোর্ট করতে সমস্যা হয়েছে: " + (err instanceof Error ? err.message : "অজানা ত্রুটি"),
        });
      } finally {
        setLoading(false);
        setProcessingMsg(null);
        e.target.value = "";
      }
    };
    // Without onerror the full-screen "processing" overlay never clears if
    // the file cannot be read (corrupted blob / permission denied).
    reader.onerror = () => {
      setLoading(false);
      setProcessingMsg(null);
      setStatus({ type: "error", msg: "ফাইলটি পড়া যায়নি — অন্য ফাইল দিয়ে চেষ্টা করুন।" });
      e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };

  /** POST only after the user reviews the preview and presses নিশ্চিত করুন. */
  const confirmImport = async () => {
    if (!preview) return;
    const { section, rows } = preview;

    setLoading(true);
    setProcessingMsg(`${toBengaliNumber(rows.length)} সারি প্রসেস হচ্ছে…`);
    setStatus(null);
    setRowErrors([]);
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: section.id, items: rows }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.error) {
        if (Array.isArray(result.rowErrors)) setRowErrors(result.rowErrors as RowError[]);
        throw new Error(result.error || `HTTP ${res.status}`);
      }
      setStatus({
        type: "success",
        msg: `${section.title}: ${toBengaliNumber(result.count)}টি তথ্য সফলভাবে ইম্পোর্ট করা হয়েছে।`,
      });
      setPreview(null);
    } catch (err) {
      setStatus({
        type: "error",
        msg: "ইম্পোর্ট করতে সমস্যা হয়েছে: " + (err instanceof Error ? err.message : "অজানা ত্রুটি"),
      });
    } finally {
      setLoading(false);
      setProcessingMsg(null);
    }
  };

  if (!isAdmin) return <div className="p-20 text-center font-bold">প্রবেশাধিকার সংরক্ষিত</div>;

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 touch-spacing">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-tiro text-gray-900 mb-1">বাল্ক ইম্পোর্ট/এক্সপোর্ট</h1>
          <p className="text-sm text-gray-500 font-medium">এক্সেল ফাইলের মাধ্যমে ডাটা ব্যাকআপ ও আপলোড</p>
        </div>
      </div>

      {status && (
        <div
          role="status"
          className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${status.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}
        >
          {status.type === "success" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <p className="text-sm font-bold">{status.msg}</p>
          <button onClick={() => setStatus(null)} className="ml-auto text-xs font-bold underline">বন্ধ করুন</button>
        </div>
      )}

      {rowErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700">
          <p className="text-sm font-bold mb-2">নিচের সারিগুলোতে ত্রুটি পাওয়া গেছে — কোনো তথ্য ইম্পোর্ট হয়নি:</p>
          <ul className="text-xs font-medium space-y-1 max-h-40 overflow-y-auto">
            {rowErrors.slice(0, 20).map((re, i) => (
              <li key={i}>সারি {toBengaliNumber(re.row)}: {re.error}</li>
            ))}
          </ul>
          {rowErrors.length > 20 && (
            <p className="text-xs font-bold mt-2">…আরও {toBengaliNumber(rowErrors.length - 20)}টি ত্রুটি</p>
          )}
        </div>
      )}

      {preview && (
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold font-tiro text-gray-900">প্রিভিউ: {preview.section.title}</h3>
              <p className="text-sm text-gray-500 font-medium mt-1">
                {preview.fileName} — মোট {toBengaliNumber(preview.rows.length)} সারি পাওয়া গেছে। নিচে প্রথম{" "}
                {toBengaliNumber(Math.min(5, preview.rows.length))}টি সারি দেখানো হলো।
              </p>
            </div>
            <button
              onClick={() => setPreview(null)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="প্রিভিউ বন্ধ করুন"
            >
              <X size={20} />
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  {preview.headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-gray-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    {preview.headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-48 truncate">
                        {String(row[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => void confirmImport()}
              disabled={loading}
              className="btn-emerald flex-1 disabled:opacity-50"
            >
              নিশ্চিত করুন — {toBengaliNumber(preview.rows.length)} সারি ইম্পোর্ট করুন
            </button>
            <button onClick={() => setPreview(null)} className="btn-outline">
              বাতিল
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SECTIONS.map((s) => (
          <div key={s.id} className="card-premium p-8 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              {s.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold font-tiro text-gray-900">{s.title}</h3>
              <p className="text-xs text-gray-400 mt-1">ব্যাকআপ বা নতুন তথ্য যোগ করুন</p>
            </div>
            <div className="w-full space-y-3">
              <button
                onClick={() => downloadTemplate(s)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
              >
                <FileDown size={18} />
                <span>টেমপ্লেট ডাউনলোড</span>
              </button>
              <button
                onClick={() => void exportData(s)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <Download size={18} />
                <span>এক্সপোর্ট করুন</span>
              </button>
              <label className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-lg shadow-emerald-100 active:scale-95">
                <Upload size={18} />
                <span>ইম্পোর্ট করুন</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, s)}
                  disabled={loading}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="fixed inset-0 z-[200] bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-emerald-600 animate-spin" />
            <p className="font-bold text-emerald-800">{processingMsg ?? "প্রসেসিং হচ্ছে, দয়া করে অপেক্ষা করুন..."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
