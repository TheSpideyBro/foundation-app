"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { 
  History, User, Activity, Calendar, 
  Search, Filter, Clock, ArrowRight
} from "lucide-react";

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase()
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('insert')) return 'bg-emerald-50 text-emerald-600';
    if (action.includes('update')) return 'bg-blue-50 text-blue-600';
    if (action.includes('delete')) return 'bg-red-50 text-red-600';
    return 'bg-gray-50 text-gray-600';
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">অডিট লগ</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের সকল কার্যক্রমের পূর্ণাঙ্গ ইতিহাস</p>
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="কার্যক্রম খুঁজুন..." className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-[14px] outline-none focus:bg-white transition-all" />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-[13px] font-bold hover:bg-gray-100 transition-all">
              <Filter size={16} /> ফিল্টার
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {logs.map((log) => (
            <div key={log.id} className="p-6 hover:bg-gray-50/50 transition-all group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getActionColor(log.action)}`}>
                    <Activity size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-[14px] font-bold text-gray-800">{log.table_name}</span>
                    </div>
                    <p className="text-[13px] text-gray-500 line-clamp-1">
                      ID: <span className="font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded">{log.record_id}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-right hidden md:block">
                    <div className="flex items-center justify-end gap-2 text-[13px] font-bold text-gray-700 mb-1">
                      <User size={14} className="text-gray-400" />
                      {log.actor_id?.split('-')[0]}...
                    </div>
                    <div className="flex items-center justify-end gap-2 text-[11px] text-gray-400">
                      <Clock size={12} />
                      {new Date(log.created_at).toLocaleString('bn-BD')}
                    </div>
                  </div>
                  <button className="p-2 text-gray-300 group-hover:text-emerald-600 group-hover:bg-emerald-50 rounded-xl transition-all">
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {logs.length === 0 && (
          <div className="p-20 text-center text-gray-400">কোনো লগ পাওয়া যায়নি</div>
        )}
      </div>
    </AppLayout>
  );
}
