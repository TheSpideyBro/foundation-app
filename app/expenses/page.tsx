"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { logAudit } from "@/lib/audit";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { 
  Plus, Search, Filter, Download, 
  XCircle, Calendar, CreditCard, 
  Tag, ShoppingBag, TrendingDown
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">ব্যয় ও খরচ</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের সকল খরচের হিসাব</p>
        </div>
        {canManage && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl text-[14px] font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
          >
            <Plus size={20} /> নতুন খরচ
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="card-premium p-6 bg-red-50/50 border-red-100">
          <p className="text-[12px] font-bold text-red-700 uppercase tracking-wider mb-1">মোট ব্যয়</p>
          <p className="text-[24px] font-bold text-red-900">৳{expenses.reduce((sum, e) => sum + e.amount, 0)}</p>
        </div>
        <div className="card-premium p-6">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">চলতি মাসে</p>
          <p className="text-[24px] font-bold text-gray-800">৳{expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((sum, e) => sum + e.amount, 0)}</p>
        </div>
        <div className="card-premium p-6">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">খরচের খাত</p>
          <p className="text-[24px] font-bold text-gray-800">{categories.length} টি</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="বিবরণ দিয়ে খুঁজুন..." className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-[14px] outline-none focus:bg-white transition-all" />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-[13px] font-bold hover:bg-gray-100 transition-all">
              <Filter size={16} /> ফিল্টার
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 text-[12px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-5">বিবরণ ও খাত</th>
                <th className="px-6 py-5 text-center">তারিখ</th>
                <th className="px-6 py-5 text-center">পদ্ধতি</th>
                <th className="px-6 py-5 text-center">পরিমাণ</th>
                <th className="px-6 py-5 text-right">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((e) => (
                <tr key={e.id} className="group hover:bg-gray-50/50 transition-all">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                        <ShoppingBag size={18} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-gray-800">{e.description}</p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1"><Tag size={10} /> {e.category?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[13px] font-medium text-gray-600 flex items-center justify-center gap-1">
                      <Calendar size={12} /> {new Date(e.date).toLocaleDateString('bn-BD')}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-bold uppercase tracking-tighter">
                      <CreditCard size={12} className="mr-1.5" /> {e.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[16px] font-bold text-red-600">৳{e.amount}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">Paid</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {expenses.length === 0 && (
          <div className="p-20 text-center text-gray-400">কোনো খরচের তথ্য পাওয়া যায়নি</div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-red-900 text-white flex items-center justify-between">
              <h2 className="text-[22px] font-bold font-tiro">নতুন খরচ এন্ট্রি</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleAddExpense} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">খরচের খাত</label>
                <select required value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-red-500/30 transition-all appearance-none">
                  <option value="">খাত নির্বাচন করুন</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">খরচের বিবরণ</label>
                <input type="text" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-red-500/30 transition-all" placeholder="যেমন: অফিস ভাড়া বা যাতায়াত খরচ" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">পরিমাণ (৳)</label>
                  <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-red-500/30 transition-all" placeholder="৫০০" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">তারিখ</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-red-500/30 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">পেমেন্ট পদ্ধতি</label>
                <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-[15px] focus:bg-white focus:border-red-500/30 transition-all appearance-none">
                  <option value="Cash">Cash</option>
                  <option value="Bkash">Bkash</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              <button type="submit" className="w-full py-4 bg-red-700 text-white rounded-2xl text-[16px] font-bold hover:bg-red-800 transition-all shadow-xl shadow-red-900/20 mt-4">খরচ নিশ্চিত করুন</button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
