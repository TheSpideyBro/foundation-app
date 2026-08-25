"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Trash2, Edit2, Save, X, 
  ArrowLeft, Tag, CheckCircle2, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";

export default function CategoryManagementPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (isAdmin) fetchCategories();
  }, [isAdmin]);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase().from("expense_categories").select("*").order("name");
    setCategories(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    const { error } = await supabase().from("expense_categories").insert([{ name: newCategory.trim() }]);
    if (error) alert("এরর: " + error.message);
    else {
      setNewCategory("");
      fetchCategories();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editValue.trim()) return;
    const { error } = await supabase().from("expense_categories").update({ name: editValue.trim() }).eq("id", id);
    if (error) alert("এরর: " + error.message);
    else {
      setEditingId(null);
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই ক্যাটাগরি ডিলিট করতে চান? এটি ডিলিট করলে আগের খরচগুলো প্রভাবিত হতে পারে।")) return;
    const { error } = await supabase().from("expense_categories").delete().eq("id", id);
    if (error) alert("এরর: " + error.message);
    else fetchCategories();
  };

  if (!isAdmin) return <div className="p-20 text-center font-bold">প্রবেশাধিকার সংরক্ষিত</div>;

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 touch-spacing">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-tiro text-gray-900 mb-1">ক্যাটাগরি ম্যানেজমেন্ট</h1>
          <p className="text-sm text-gray-500 font-medium">খরচের ক্যাটাগরিগুলো নিয়ন্ত্রণ করুন</p>
        </div>
      </div>

      <div className="max-w-xl space-y-6">
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="নতুন ক্যাটাগরির নাম..." 
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" 
          />
          <button 
            onClick={handleAdd}
            className="btn-emerald px-6 rounded-2xl"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="card-premium overflow-hidden border border-emerald-50 shadow-sm">
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="p-10 text-center"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div></div>
            ) : categories.length === 0 ? (
              <div className="p-10 text-center text-gray-400">কোনো ক্যাটাগরি পাওয়া যায়নি।</div>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="p-5 flex items-center justify-between group">
                  {editingId === cat.id ? (
                    <div className="flex-1 flex gap-2">
                      <input 
                        type="text" 
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                        autoFocus
                      />
                      <button onClick={() => handleUpdate(cat.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                      <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"><X size={18} /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Tag size={18} className="text-emerald-600" />
                        <span className="font-bold text-gray-900">{cat.name}</span>
                        {cat.is_default && <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">ডিফল্ট</span>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingId(cat.id); setEditValue(cat.name); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        {!cat.is_default && (
                          <button 
                            onClick={() => handleDelete(cat.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
