"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";
import { isAdmin as hasAdminRole } from "@/lib/auth";
import { toBengaliNumber } from "@/lib/utils";
import AdminBackLink from "@/components/AdminBackLink";
import { 
  History, User, Activity, Calendar, 
  Search, Filter, Clock, ArrowRight, AlertCircle, Loader2
} from "lucide-react";

const PAGE_SIZE = 50;

export default function AuditLogsPage() {
  const { role } = useAuth();
  const isAdmin = hasAdminRole(role);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const from = pageNum * PAGE_SIZE;
      const { data, error } = await supabase()
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      setLoadError(null);
      setLogs((prev) => (append ? [...prev, ...(data || [])] : data || []));
      // A short page means we've reached the end.
      setHasMore((data || []).length === PAGE_SIZE);
      setPage(pageNum);
    } catch (err) {
      console.error("Error fetching logs:", err);
      if (!append) setLogs([]);
      setLoadError(err instanceof Error ? err.message : "লগ লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // audit_log RLS is admin-only; skip the query (and its guaranteed empty
    // result) for anyone else instead of rendering "no logs found".
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    void fetchLogs(0, false);
  }, [isAdmin]);

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

  if (!isAdmin) return <div className="p-20 text-center font-bold">প্রবেশাধিকার সংরক্ষিত</div>;

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <AdminBackLink />
          <div>
            <h1 className="text-[28px] font-bold font-shadhinata text-gray-900">অডিট লগ</h1>
            <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের সকল কার্যক্রমের পূর্ণাঙ্গ ইতিহাস</p>
          </div>
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
          {loadError ? (
            <div className="p-20 text-center text-gray-400">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-500 opacity-60" />
              <p className="font-bold font-shadhinata text-sm mb-1 text-gray-600">অডিট লগ লোড করা যায়নি</p>
              <p className="text-xs">{loadError}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <History size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold font-shadhinata text-sm">
                {searchQuery ? "অনুসন্ধানে কোনো লগ পাওয়া যায়নি।" : "কোনো লগ পাওয়া যায়নি।"}
              </p>
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
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-bold">
                          <User size={12} /> {log.actor_email || 'সিস্টেম'}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-bold">
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

      {!loading && !loadError && logs.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-xs text-gray-400 font-bold">
            মোট {toBengaliNumber(logs.length)}টি লগ দেখানো হচ্ছে
          </p>
          {hasMore && (
            <button
              onClick={() => void fetchLogs(page + 1, true)}
              disabled={loadingMore}
              className="btn-outline flex items-center gap-2 disabled:opacity-50"
            >
              {loadingMore && <Loader2 size={16} className="animate-spin" />}
              আরো দেখুন
            </button>
          )}
        </div>
      )}
    </div>
  );
}
