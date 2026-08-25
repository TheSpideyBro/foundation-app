"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Search, Filter, Download, 
  Trash2, Edit2, Wallet, Calendar,
  TrendingDown, ArrowUpRight, X, Save
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";

export default function ExpensesPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  const isStaff = isAdmin || role === 'treasurer';
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    category: "General",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
    proof_url: ""
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await supabase().from("expenses").select("*").order("date", { ascending: false });
      setExpenses(data || []);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (expense: any = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        category: expense.category,
        amount: expense.amount.toString(),
        date: expense.date,
        description: expense.description || "",
        proof_url: expense.proof_url || ""
      });
    } else {
      setEditingExpense(null);
      setFormData({
        category: "General",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        proof_url: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.date || !formData.description) {
      alert("টাকার পরিমাণ, তারিখ এবং বিবরণ আবশ্যক।");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        created_by: user?.id
      };

      if (editingExpense) {
        const { error } = await supabase()
          .from("expenses")
          .update(payload)
          .eq("id", editingExpense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase()
          .from("expenses")
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchExpenses();
    } catch (err) {
      console.error("Error saving expense:", err);
      alert("সেভ করতে সমস্যা হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই খরচটি ডিলিট করতে চান?")) return;
    try {
      const { error } = await supabase().from("expenses").delete().eq("id", id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("ডিলিট করতে সমস্যা হয়েছে।");
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 touch-spacing">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-tiro text-gray-900 mb-1">ব্যয় ও খরচ</h1>
          <p className="text-sm text-gray-500 font-medium">ফাউন্ডেশনের সকল খরচের হিসাব</p>
        </div>
        {isStaff && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 bg-rose-600 text-white rounded-2xl font-bold h-12 px-6 hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 active:scale-95"
          >
            <Plus size={20} />
            <span>নতুন খরচ</span>
          </button>
        )}
      </div>

      <div className="card-premium overflow-hidden border border-red-50 shadow-sm">
        <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="খরচের বিবরণ খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 transition-all" 
            />
          </div>
        </div>

        <div className="divide-y divide-gray-50 bg-gray-50/30">
          {filteredExpenses.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <TrendingDown size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold font-tiro text-sm">কোনো খরচের তথ্য পাওয়া যায়নি।</p>
            </div>
          ) : (
            filteredExpenses.map((e) => (
              <div key={e.id} className="p-5 sm:p-6 bg-white hover:bg-rose-50/30 transition-all group relative border-b border-gray-50 last:border-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <TrendingDown size={20} />
                    </div>
                    <div>
                      <p className="text-[15px] sm:text-base font-bold text-gray-900 leading-snug font-tiro">{e.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium bg-gray-50 px-2 py-0.5 rounded-md">
                          <Calendar size={12} className="text-rose-600" /> {e.date}
                        </span>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-bold uppercase rounded-lg tracking-widest border border-rose-100">
                          {e.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10">
                    <div className="text-right">
                      <p className="text-lg sm:text-xl font-bold text-rose-600 font-tiro">৳{Number(e.amount).toLocaleString()}</p>
                    </div>
                    
                    {isStaff && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button 
                          onClick={() => handleOpenModal(e)}
                          className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                          title="এডিট"
                        >
                          <Edit2 size={18} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(e.id)}
                            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                            title="ডিলিট"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-red-600 text-white">
              <div>
                <h2 className="text-xl font-bold font-tiro">{editingExpense ? 'খরচ এডিট করুন' : 'নতুন খরচ যোগ করুন'}</h2>
                <p className="text-red-100 text-xs mt-1">সঠিক তথ্য প্রদান করে সেভ করুন</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">খরচের বিবরণ *</label>
                <input 
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 transition-all"
                  placeholder="কী বাবদ খরচ হয়েছে লিখুন"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">টাকার পরিমাণ *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                    <input 
                      type="number"
                      inputMode="numeric"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">তারিখ *</label>
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">ক্যাটাগরি</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 transition-all"
                >
                  <option value="General">সাধারণ</option>
                  <option value="Utility">ইউটিলিটি</option>
                  <option value="Maintenance">রক্ষণাবেক্ষণ</option>
                  <option value="Event">অনুষ্ঠান</option>
                  <option value="Charity">দান/সাহায্য</option>
                  <option value="Other">অন্যান্য</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save size={20} />
                      <span>সেভ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
