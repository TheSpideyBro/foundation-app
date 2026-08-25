"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { 
  History, User, Activity, Calendar, 
  Search, Filter, Clock, ArrowRight
} from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await supabase().from("audit_log").select("*").order("created_at", { ascending: false });
        setLogs(data || []);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getActionLabel = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('INSERT')) return 'নতুন যোগ';
    if (act.includes('UPDATE')) return 'পরিবর্তন';
    if (act.includes('DELETE')) return 'ডিলিট';
    return action;
  };

  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('INSERT')) return 'bg-emerald-50 text-emerald-600';
    if (act.includes('UPDATE')) return 'bg-blue-50 text-blue-600';
    if (act.includes('DELETE')) return 'bg-red-50 text-red-600';
    return 'bg-gray-50 text-gray-600';
  };

  const filteredLogs = logs.filter(log => 
    log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.actor_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.target_table?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8">
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
            <input 
              type="text" 
              placeholder="কার্যক্রম বা ইমেইল খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-[14px] outline-none focus:bg-white transition-all" 
            />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredLogs.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <History size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold font-tiro text-sm">কোনো লগ পাওয়া যায়নি।</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50/50 transition-all group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${getActionColor(log.action)}`}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-gray-900 leading-snug">
                        <span className="font-bold">{getActionLabel(log.action)}</span>: {log.target_table === 'donations' ? 'অনুদান' : log.target_table === 'expenses' ? 'খরচ' : log.target_table === 'members' ? 'সদস্য' : log.target_table}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                          <User size={12} /> {log.actor_email || 'সিস্টেম'}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                          <Clock size={12} /> {new Date(log.created_at).toLocaleString('bn-BD')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded-lg tracking-wider">
                      ID: {log.target_id?.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
