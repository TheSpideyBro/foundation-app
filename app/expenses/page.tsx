"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { logAudit } from "@/lib/audit";
import { triggerSheetsSync } from "@/lib/sheets-auto";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import { ReceiptText, Plus, X, Trash2, Upload, Tag } from "lucide-react";
import { formatMoney, formatDateBengali } from "@/lib/utils";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

// Fallback categories used until the DB-backed category table is set up
const FALLBACK_CATEGORIES = ["চিকিৎসা", "খাদ্য", "শিক্ষা", "জরুরি সহায়তা", "পরিবহন", "অন্যান্য"];
const catColor: Record<string, string> = {
  "চিকিৎসা": C.red, "খাদ্য": C.gold, "শিক্ষা": C.ink,
  "জরুরি সহায়তা": C.ink, "পরিবহন": C.sub, "অন্যান্য": C.sub,
};

const CUSTOM_OPTION = "__custom__";

export default function ExpensesPage() {
  const { user, role } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [catsLoading, setCatsLoading] = useState(true);

  const fetchExpenses = async () => {
    if (user === undefined) return;
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase()
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });
      setExpenses(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, [user]);
  useEffect(() => {
    if (user === undefined) return;
    if (!user) setLoading(false);
  }, [user]);

  // Load categories from DB (migration-phase1.sql); fall back to hardcoded list.
  useEffect(() => {
    if (user === undefined) return;
    (async () => {
      setCatsLoading(true);
      try {
        const { data, error } = await supabase().from("expense_categories").select("*").order("is_default", { ascending: false }).order("name");
        if (!error && data && data.length > 0) {
          setCategories(data);
          setCategory(data.find((c: any) => c.is_default)?.name || data[0].name);
        } else {
          setCategory(FALLBACK_CATEGORIES[0]);
        }
      } catch {
        setCategory(FALLBACK_CATEGORIES[0]);
      } finally {
        setCatsLoading(false);
      }
    })();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount) return;
    const finalCat = useCustom ? customCategory.trim() : category;
    if (!finalCat) {
      alert("ক্যাটেগরি দিন।");
      return;
    }

    let proofUrl: string | undefined;
    if (proofFile) {
      const fileName = `${Date.now()}_${proofFile.name}`;
      const { error: uploadError } = await supabase().storage.from("expense-proofs").upload(fileName, proofFile);
      if (uploadError) {
        alert("প্রুফ ছবি আপলোড হয়নি: " + uploadError.message);
        return;
      }
      const { data: urlData } = supabase().storage.from("expense-proofs").getPublicUrl(fileName);
      proofUrl = urlData?.publicUrl;
    }

    const { error, data } = await supabase().from("expenses").insert({
      category: finalCat, amount: parseFloat(amount), date, description, proof_url: proofUrl, created_by: user.id
    });
    if (error) {
      alert("খরচ যোগ করা যায়নি: " + error.message);
      return;
    }
    logAudit("expense.insert", "expenses", (data as any)?.id, { category: finalCat, amount: parseFloat(amount) });
    triggerSheetsSync();
    setShowForm(false); setAmount(""); setDescription(""); setProofFile(null);
    setUseCustom(false); setCustomCategory("");
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই খরচ মুছতে চান?")) return;
    const { data: rows, error } = await supabase().from("expenses").select("category, amount, description").eq("id", id);
    if (error) {
      alert("খরচ মুছা যায়নি: " + error.message);
      return;
    }
    logAudit("expense.delete", "expenses", id, { category: rows?.[0]?.category, amount: rows?.[0]?.amount });
    triggerSheetsSync();
    fetchExpenses();
  };

  const catList = useCustom ? [...categories.map((c: any) => c.name), customCategory].filter(Boolean) : [];
  const activeCategories = useCustom ? catList : (categories.length > 0 ? categories : FALLBACK_CATEGORIES.map((n) => ({ name: n })));
  const colorFor = (name: string) => catColor[name] || C.sub;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[19px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>খরচের হিসাব</h1>
        <div className="flex items-center gap-2">
          <a href="/admin" className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-2 rounded-sm border transition hover:brightness-105" style={{ borderColor: C.border, color: C.ink, background: C.paper }}>
            <Tag size={14} /> ক্যাটেগরি ব্যবস্থাপনা
          </a>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-sm hover:brightness-105 transition" style={{ background: C.gold, color: C.ink }}>
            <Plus size={15} strokeWidth={2.5} /> নতুন খরচ যোগ করুন
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-sm border overflow-hidden" style={{ background: C.paper, borderColor: C.border }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>নতুন খরচ</h2>
              <button onClick={() => setShowForm(false)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>বিভাগ</label>
                {catsLoading ? (
                  <div className="rounded-sm px-3 py-2.5 text-[12px]" style={{ background: C.page, color: C.sub }}>লোড হচ্ছে...</div>
                ) : (
                  <>
                    <select
                      value={useCustom ? CUSTOM_OPTION : category}
                      onChange={(e) => {
                        if (e.target.value === CUSTOM_OPTION) { setUseCustom(true); setCustomCategory(""); }
                        else { setUseCustom(false); setCategory(e.target.value); }
                      }}
                      className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2"
                      style={{ background: "#fff", borderColor: C.border }}
                    >
                      {activeCategories.map((c: any) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                      <option value={CUSTOM_OPTION}>নিজস্ব (নিজে লিখুন)...</option>
                    </select>
                    {useCustom && (
                      <input
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="নতুন বিভাগের নাম লিখুন..."
                        className="mt-2 w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2"
                        style={{ background: "#fff", border: `1px solid ${C.gold}` }}
                      />
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>পরিমাণ (৳)</label>
                <input type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2" style={{ background: "#fff", borderColor: C.border }} />
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>তারিখ</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2" style={{ background: "#fff", borderColor: C.border }} />
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>বিবরণ</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none resize-none" style={{ background: "#fff", borderColor: C.border }} />
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>প্রমাণ পত্র (ছবি)</label>
                <label className="flex items-center gap-2 rounded-sm border px-3 py-2.5 cursor-pointer transition hover:brightness-95" style={{ borderColor: C.border, background: "#fff" }}>
                  <Upload size={16} style={{ color: C.sub }} />
                  <span className="text-[13px]" style={{ color: C.sub }}>{proofFile ? proofFile.name : "ছবি বাছাই করুন"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-sm text-[13.5px] font-semibold transition hover:brightness-105" style={{ background: C.gold, color: C.ink }}>খরচ যোগ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Expense List */}
      {loading ? (
        <div className="text-center py-12" style={{ color: C.sub }}>লোড হচ্ছে...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 rounded-sm border" style={{ background: C.paper, borderColor: C.border, color: C.sub }}>কোনো খরচ নেই</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {expenses.map((exp) => (
            <div key={exp.id} className="rounded-sm border p-5 flex items-center justify-between group" style={{ background: C.paper, borderColor: C.border }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: colorFor(exp.category) + "1A" }}>
                  <ReceiptText size={16} style={{ color: colorFor(exp.category) }} />
                </div>
                <div>
                  <p className="text-[14px] font-medium" style={{ color: C.text }}>{exp.description || exp.category}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium" style={{ background: colorFor(exp.category) + "1A", color: colorFor(exp.category) }}>{exp.category}</span>
                    <span className="text-[11.5px]" style={{ color: C.sub }}>{formatDateBengali(exp.date)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[15px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.red }}>−{formatMoney(exp.amount)}</span>
                {role === "admin" && <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-sm opacity-0 group-hover:opacity-100 hover:brightness-95 transition" style={{ background: C.red + "14" }}><Trash2 size={13} style={{ color: C.red }} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
