"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Search, Calendar, Download, 
  Trash2, Edit2, Wallet, User,
  Filter, MoreHorizontal
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";

export default function DonationsPage() {
  const { user, role } = useAuth();
  // Special bypass for admin email
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  
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

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই অনুদানটি ডিলিট করতে চান?")) return;
    try {
      const { error } = await supabase().from("donations").delete().eq("id", id);
      if (error) throw error;
      setDonations(donations.filter(d => d.id !== id));
    } catch (err) {
      alert("ডিলিট করতে সমস্যা হয়েছে।");
    }
  };

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
        {isAdmin && (
          <button 
            onClick={() => alert("অনুদান যুক্ত করার ফিচারটি তৈরি করা হচ্ছে...")}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            <Plus size={20} />
            <span>নতুন জমা</span>
          </button>
        )}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="সদস্য খুঁজুন..." className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-[14px] outline-none focus:bg-white transition-all" />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {donations.map((d) => (
            <div key={d.id} className="p-6 hover:bg-gray-50/50 transition-all group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                    {d.members?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900">{d.members?.name || 'অজ্ঞাত'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Calendar size={12} className="text-gray-400" />
                      <p className="text-xs text-gray-500">{d.date}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8">
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600 font-tiro">৳{Number(d.amount).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{d.donation_month || 'সাধারণ'}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => window.open(`/api/receipts/${d.id}`, "_blank")}
                      className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                      title="রসিদ ডাউনলোড"
                    >
                      <Download size={18} />
                    </button>
                    
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="এডিট"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(d.id)}
                          className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-red-600 hover:bg-red-50 transition-all"
                          title="ডিলিট"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
