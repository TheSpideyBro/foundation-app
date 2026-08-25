"use client";

import { useState, useEffect } from "react";
import { 
  AlertCircle, MessageCircle, Search, 
  Calendar, Phone, User, ArrowLeft,
  CheckCircle2, Clock, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers";

export default function PendingPledgesPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isAdmin) fetchPending();
  }, [month, isAdmin]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pending-pledges?month=${month}`);
      const data = await res.json();
      setPending(data.pending || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = (member: any) => {
    const text = `আসসালামু আলাইকুম, ${member.name}। দৌলখাঁড় হিলফুল ফুযুল ফাউন্ডেশনের ${month} মাসের আপনার মাসিক অঙ্গীকারের ৳${member.pledge} এর মধ্যে ৳${member.paid} জমা হয়েছে। বাকি ৳${member.remaining} দ্রুত জমা দেওয়ার জন্য অনুরোধ করা হলো। ধন্যবাদ।`;
    const url = `https://wa.me/${member.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!isAdmin) return <div className="p-20 text-center font-bold">প্রবেশাধিকার সংরক্ষিত</div>;

  const filtered = pending.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 touch-spacing">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-tiro text-gray-900 mb-1">বাকি চাঁদার তালিকা</h1>
          <p className="text-sm text-gray-500 font-medium">মাসিক অঙ্গীকার অনুযায়ী অনাদায়ী হিসাব</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="সদস্যের নাম খুঁজুন..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" 
          />
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100">
          <Calendar className="ml-3 text-emerald-600" size={18} />
          <input 
            type="month" 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="pr-4 py-2 text-sm font-bold outline-none bg-transparent"
          />
        </div>
      </div>

      <div className="card-premium overflow-hidden border border-emerald-50 shadow-sm">
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="p-20 text-center"><div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div></div>
          ) : filtered.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20 text-emerald-600" />
              <p className="font-bold font-tiro text-sm">এই মাসের সকল অঙ্গীকার পূর্ণ হয়েছে!</p>
            </div>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="p-6 hover:bg-emerald-50/30 transition-all group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      {p.name[0]}
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900 font-tiro">{p.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} /> {p.phone || 'ফোন নেই'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-8">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600 font-tiro">৳{p.remaining.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">বাকি (মোট: ৳{p.pledge})</p>
                    </div>
                    
                    <button 
                      onClick={() => sendReminder(p)}
                      disabled={!p.phone}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl font-bold text-xs hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                      <MessageCircle size={16} />
                      <span>রিমাইন্ডার</span>
                    </button>
                  </div>
                </div>
                {p.paid > 0 && (
                  <div className="mt-4 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-1000" 
                      style={{ width: `${(p.paid / p.pledge) * 100}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
