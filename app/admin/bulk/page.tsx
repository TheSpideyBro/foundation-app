"use client";

import { useState } from "react";
import { 
  Download, Upload, FileText, ArrowLeft, 
  Database, CheckCircle2, AlertTriangle, 
  Loader2, Trash2
} from "lucide-react";
import Link from "next/link";
import * as XLSX from 'xlsx';
import { useAuth } from "@/components/providers";

export default function BulkManagementPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const exportData = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bulk?type=${type}`);
      const data = await res.json();
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type);
      XLSX.writeFile(wb, `${type}_backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      setStatus({ type: 'success', msg: `${type} সফলভাবে এক্সপোর্ট করা হয়েছে।` });
    } catch (err) {
      setStatus({ type: 'error', msg: "এক্সপোর্ট করতে সমস্যা হয়েছে।" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const items = XLSX.utils.sheet_to_json(ws);

        if (items.length === 0) throw new Error("ফাইলটি খালি।");

        const res = await fetch('/api/admin/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, items })
        });
        const result = await res.json();
        
        if (result.error) throw new Error(result.error);
        setStatus({ type: 'success', msg: `সফলভাবে ${result.count} টি তথ্য ইম্পোর্ট করা হয়েছে।` });
      } catch (err: any) {
        setStatus({ type: 'error', msg: "ইম্পোর্ট করতে সমস্যা হয়েছে: " + err.message });
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  if (!isAdmin) return <div className="p-20 text-center font-bold">প্রবেশাধিকার সংরক্ষিত</div>;

  const sections = [
    { id: 'members', title: 'সদস্য তালিকা', icon: <Database size={24} /> },
    { id: 'donations', title: 'অনুদান রিপোর্ট', icon: <FileText size={24} /> },
    { id: 'expenses', title: 'খরচের হিসাব', icon: <Trash2 size={24} /> }
  ];

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
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <p className="text-sm font-bold">{status.msg}</p>
          <button onClick={() => setStatus(null)} className="ml-auto text-xs font-bold underline">বন্ধ করুন</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map((s) => (
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
                onClick={() => exportData(s.id)}
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
                  onChange={(e) => handleFileUpload(e, s.id)}
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
            <p className="font-bold text-emerald-800">প্রসেসিং হচ্ছে, দয়া করে অপেক্ষা করুন...</p>
          </div>
        </div>
      )}
    </div>
  );
}
