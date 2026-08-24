"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Search, Filter, Download, 
  Trash2, Edit2, Wallet, Calendar,
  TrendingDown, ArrowUpRight
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";

export default function ExpensesPage() {
  const { user, role } = useAuth();
  // Special bypass for admin email
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const { data } = await supabase().from("expenses").select("*").order("date", { ascending: false });
        setExpenses(data || []);
      } catch (err) {
        console.error("Error fetching expenses:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই খরচটি ডিলিট করতে চান?")) return;
    try {
      const { error } = await supabase().from("expenses").delete().eq("id", id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
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
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">ব্যয় ও খরচ</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের সকল খরচের হিসাব</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => alert("খরচ যুক্ত করার ফিচারটি তৈরি করা হচ্ছে...")}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
          >
            <Plus size={20} />
            <span>নতুন খরচ</span>
          </button>
        )}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="খরচ খুঁজুন..." className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-[14px] outline-none focus:bg-white transition-all" />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {expenses.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <TrendingDown size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold font-tiro text-sm">কোনো খরচের তথ্য পাওয়া যায়নি।</p>
            </div>
          ) : (
            expenses.map((e) => (
              <div key={e.id} className="p-6 hover:bg-gray-50/50 transition-all group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                      <TrendingDown size={20} />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-gray-900 leading-snug">{e.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                          <Calendar size={12} /> {e.date}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-bold uppercase rounded-lg tracking-wider">
                          {e.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600 font-tiro">৳{Number(e.amount).toLocaleString()}</p>
                    </div>
                    
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="এডিট"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(e.id)}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
