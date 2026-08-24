"use client";

import { useState, useEffect } from "react";
import { 
  Heart, Plus, Search, Filter, 
  Calendar, Download, MessageSquare, 
  Trash2, Edit2, ChevronRight, User,
  Activity, Wallet
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import Link from "next/link";

export default function DonationsPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const { data } = await supabase()
          .from("donations")
          .select("*, members(name, phone)")
          .order("date", { ascending: false });
        setDonations(data || []);
      } catch (err) {
        console.error("Error fetching donations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDonations();
  }, []);

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">অনুদান ও জমা</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের সকল জমার হিসাব</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {donations.slice(0, 3).map((d, i) => (
          <div key={i} className="card-premium p-6 bg-white">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{d.members?.name || 'অজ্ঞাত'}</p>
                  <p className="text-xl font-bold text-gray-900 font-tiro">৳{Number(d.amount).toLocaleString()}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="সদস্য খুঁজুন..." className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-[14px] outline-none focus:bg-white transition-all" />
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {donations.map((d) => (
            <div key={d.id} className="p-6 hover:bg-gray-50/50 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                    {d.members?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900">{d.members?.name || 'অজ্ঞাত'}</p>
                    <p className="text-xs text-gray-500">{d.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600 font-tiro">৳{Number(d.amount).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{d.donation_month || 'সাধারণ'}</p>
                  </div>
                  <button onClick={() => window.open(`/api/receipts/${d.id}`, "_blank")} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                    <Download size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
