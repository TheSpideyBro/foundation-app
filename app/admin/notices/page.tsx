"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Trash2, Edit2, Save, X, 
  ArrowLeft, Megaphone, CheckCircle2, 
  AlertTriangle, Eye, EyeOff
} from "lucide-react";
import Link from "next/link";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";

export default function NoticeManagementPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [formData, setFormData] = useState({ title: "", content: "", is_active: true });

  useEffect(() => {
    if (isAdmin) fetchNotices();
  }, [isAdmin]);

  const fetchNotices = async () => {
    setLoading(true);
    const { data } = await supabase().from("notices").select("*").order("created_at", { ascending: false });
    setNotices(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, created_by: user?.id };
    
    if (editingNotice) {
      const { error } = await supabase().from("notices").update(payload).eq("id", editingNotice.id);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase().from("notices").insert([payload]);
      if (error) alert(error.message);
    }
    
    setIsModalOpen(false);
    fetchNotices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই নোটিশটি ডিলিট করতে চান?")) return;
    await supabase().from("notices").delete().eq("id", id);
    fetchNotices();
  };

  const toggleStatus = async (notice: any) => {
    await supabase().from("notices").update({ is_active: !notice.is_active }).eq("id", notice.id);
    fetchNotices();
  };

  if (!isAdmin) return <div className="p-20 text-center font-bold">প্রবেশাধিকার সংরক্ষিত</div>;

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 touch-spacing">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-2">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold font-tiro text-gray-900 mb-1">নোটিশ বোর্ড</h1>
            <p className="text-sm text-gray-500 font-medium">সদস্যদের জন্য ঘোষণা তৈরি করুন</p>
          </div>
        </div>
        <button 
          onClick={() => { setEditingNotice(null); setFormData({ title: "", content: "", is_active: true }); setIsModalOpen(true); }}
          className="btn-emerald px-6 h-12 rounded-2xl flex items-center gap-2"
        >
          <Plus size={20} />
          <span>নতুন নোটিশ</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full p-20 text-center"><div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div></div>
        ) : notices.length === 0 ? (
          <div className="col-span-full p-20 text-center text-gray-400">কোনো নোটিশ পাওয়া যায়নি।</div>
        ) : (
          notices.map((notice) => (
            <div key={notice.id} className={`card-premium p-6 border ${notice.is_active ? 'border-emerald-50 bg-white' : 'border-gray-100 bg-gray-50/50 grayscale'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${notice.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                  <Megaphone size={20} />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleStatus(notice)} className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg transition-all" title={notice.is_active ? 'লুকান' : 'দেখান'}>
                    {notice.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button onClick={() => { setEditingNotice(notice); setFormData({ title: notice.title, content: notice.content, is_active: notice.is_active }); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-all">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(notice.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 font-tiro">{notice.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-3 mb-4">{notice.content}</p>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border-t border-gray-50 pt-4">
                প্রকাশিত: {new Date(notice.created_at).toLocaleDateString('bn-BD')}
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-600 text-white">
              <h2 className="text-xl font-bold font-tiro">{editingNotice ? 'নোটিশ এডিট' : 'নতুন নোটিশ'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">শিরোনাম *</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">বিস্তারিত ঘোষণা *</label>
                <textarea 
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[150px]"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-gray-700">সদস্যদের কাছে দৃশ্যমান করুন</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold">বাতিল</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold">সেভ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
