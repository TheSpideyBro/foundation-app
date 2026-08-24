"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { Search, History, Clock, User } from "lucide-react";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

export default function AuditLogPage() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    if (role !== 'admin') return;
    setLoading(true);
    try {
      const { data } = await supabase()
        .from("audit_log_view")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [role]);

  const filtered = logs.filter(l => 
    l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.table_name.toLowerCase().includes(search.toLowerCase())
  );

  if (role !== 'admin') return <AppLayout><div className="p-10 text-center">Unauthorized</div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[19px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>অডিট লগ (Audit History)</h1>
      </div>

      <div className="flex items-center gap-2 rounded-sm border px-3 py-2 mb-6" style={{ background: C.paper, borderColor: C.border }}>
        <Search size={15} style={{ color: C.sub }} />
        <input placeholder="ইমেইল, অ্যাকশন বা টেবিল দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-[13px] outline-none flex-1" />
      </div>

      <div className="bg-white rounded-sm border overflow-hidden" style={{ borderColor: C.border }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500">
              <tr>
                <th className="px-6 py-3">সময়</th>
                <th className="px-6 py-3">ইউজার</th>
                <th className="px-6 py-3">অ্যাকশন</th>
                <th className="px-6 py-3">টেবিল</th>
                <th className="px-6 py-3">বিস্তারিত</th>
              </tr>
            </thead>
            <tbody className="divide-y text-[12px]" style={{ borderColor: C.border }}>
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("bn-BD")}
                  </td>
                  <td className="px-6 py-4 font-medium">{l.user_email || 'System'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                      l.action.includes('insert') ? 'bg-green-100 text-green-700' : 
                      l.action.includes('delete') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{l.table_name}</td>
                  <td className="px-6 py-4 max-w-xs truncate text-gray-500" title={JSON.stringify(l.details)}>
                    {JSON.stringify(l.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
