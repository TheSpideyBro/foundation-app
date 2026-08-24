"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { logAudit } from "@/lib/audit";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { 
  Plus, Search, Filter, Download, 
  XCircle, Calendar, CreditCard, 
  Tag, ShoppingBag, TrendingDown, X
} from "lucide-react";

export default function ExpensesPage() {
  const { role } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ 
    category_id: "", 
    amount: 0, 
    date: new Date().toISOString().split('T')[0], 
    description: "",
    payment_method: "Cash"
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: expenseData } = await supabase()
      .from("expenses")
      .select("*, category:expense_categories(name)")
      .order("date", { ascending: false });
    const { data: catData } = await supabase().from("expense_categories").select("*");
    
    setExpenses(expenseData || []);
    setCategories(catData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase().from("expenses").insert([formData]).select();
    if (error) alert(error.message);
    else {
      logAudit("expense.create", "expenses", data[0].id, formData);
      setShowAddModal(false);
      fetchData();
    }
  };

  const canManage = role === 'admin' || role === 'treasurer';

  return (
    <AppLayout>
      <div className="touch-spacing pb-20 animate-slide-up">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-tiro text-gray-900">ব্যয় ও খরচ</h1>
            <p className="text-xs sm:text-sm text-gray-500">ফাউন্ডেশনের সকল খরচের হিসাব</p>
          </div>
          {canManage && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-emerald bg-rose-600 hover:bg-rose-700 shadow-rose-900/20 py-3 text-sm"
            >
              <Plus size={20} /> নতুন খরচ
            </button>
          )}
        </div>

        {/* Summary Cards - Grid on all screens */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
          <div className="card-premium p-4 sm:p-6 bg-rose-50/50 border-rose-100 col-span-2 sm:col-span-1">
            <p className="text-[10px] sm:text-[12px] font-bold text-rose-700 uppercase tracking-widest mb-1">মোট ব্যয়</p>
            <p className="text-xl sm:text-2xl font-bold text-rose-900 font-tiro">৳{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
          </div>
          <div className="card-premium p-4 sm:p-6">
            <p className="text-[10px] sm:text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">চলতি মাসে</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-800 font-tiro">৳{expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
          </div>
          <div className="card-premium p-4 sm:p-6">
            <p className="text-[10px] sm:text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">খরচের খাত</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-800 font-tiro">{categories.length} টি</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="card-premium p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="বিবরণ দিয়ে খুঁজুন..." 
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:bg-white transition-all" 
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all">
              <Filter size={16} /> ফিল্টার
            </button>
          </div>
        </div>

        {/* Expenses List - Mobile Cards, Desktop Table */}
        <div className="space-y-4 sm:space-y-0 sm:table-container">
          {/* Mobile View */}
          <div className="sm:hidden space-y-4">
            {loading ? (
              [1, 2].map(i => (
                <div key={i} className="card-premium p-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                </div>
              ))
            ) : expenses.length === 0 ? (
              <div className="card-premium p-10 text-center text-gray-400">কোনো তথ্য নেই</div>
            ) : (
              expenses.map((e) => (
                <div key={e.id} className="card-premium p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                        <ShoppingBag size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{e.description}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1"><Tag size={10} /> {e.category?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-rose-600 font-tiro">৳{e.amount.toLocaleString()}</p>
                      <span className="text-[8px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full">Paid</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-gray-50">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Calendar size={12} /> {new Date(e.date).toLocaleDateString('bn-BD')}
                    </span>
                    <span className="text-gray-500 font-bold uppercase">
                      {e.payment_method}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="table-header">
                  <th className="px-6 py-5">বিবরণ ও খাত</th>
                  <th className="px-6 py-5 text-center">তারিখ</th>
                  <th className="px-6 py-5 text-center">পদ্ধতি</th>
                  <th className="px-6 py-5 text-center">পরিমাণ</th>
                  <th className="px-6 py-5 text-right">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((e) => (
                  <tr key={e.id} className="table-row group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ShoppingBag size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{e.description}</p>
                          <p className="text-[11px] text-gray-400 flex items-center gap-1"><Tag size={10} /> {e.category?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-medium text-gray-600 flex items-center justify-center gap-1">
                        <Calendar size={12} /> {new Date(e.date).toLocaleDateString('bn-BD')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                        <CreditCard size={12} className="mr-1.5" /> {e.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-base font-bold text-rose-600 font-tiro">৳{e.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">Paid</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Expense Modal - Mobile Optimized */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-emerald-950/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="p-6 sm:p-8 bg-rose-900 text-white flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-xl sm:text-2xl font-bold font-tiro">নতুন খরচ এন্ট্রি</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 sm:p-8 space-y-4 sm:space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">খরচের খাত</label>
                <select required value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-base focus:bg-white focus:border-rose-500/30 transition-all">
                  <option value="">খাত নির্বাচন করুন</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">খরচের বিবরণ</label>
                <input type="text" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-base focus:bg-white focus:border-rose-500/30 transition-all" placeholder="যেমন: অফিস ভাড়া" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">পরিমাণ (৳)</label>
                  <input type="number" inputMode="numeric" required value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-base focus:bg-white focus:border-rose-500/30 transition-all" placeholder="৫০০" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">তারিখ</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-base focus:bg-white focus:border-rose-500/30 transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">পেমেন্ট পদ্ধতি</label>
                <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-base focus:bg-white focus:border-rose-500/30 transition-all">
                  <option value="Cash">Cash</option>
                  <option value="Bkash">Bkash</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              <button type="submit" className="w-full py-4 bg-rose-700 text-white rounded-2xl text-base font-bold hover:bg-rose-800 transition-all shadow-xl shadow-rose-900/20 mt-4 active:scale-95">খরচ নিশ্চিত করুন</button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
