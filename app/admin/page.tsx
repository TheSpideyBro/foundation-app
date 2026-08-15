"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import { useAuth } from "@/components/providers";
import {
  Users, ShieldCheck, Tag, Info, RefreshCw, Plus, Trash2, Edit2, X, Check, ScrollText, Download,
} from "lucide-react";
import { formatMoney, formatDateBengali } from "@/lib/utils";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "অ্যাডমিন",
  treasurer: "ট্রেজারার",
  member: "সদস্য",
};

const roleColors: Record<string, string> = {
  admin: C.ink,
  treasurer: C.gold,
  member: C.sub,
};

type TabKey = "users" | "categories" | "audit" | "info";

export default function AdminPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("users");

  // Non-admins are redirected; while role is still resolving, show nothing.
  useEffect(() => {
    if (!authLoading && role && role !== "admin" && user) {
      router.replace("/dashboard");
    }
  }, [role, authLoading, user, router]);

  if (authLoading || (role && role !== "admin")) {
    return (
      <AppLayout>
        <div className="text-center py-20" style={{ color: C.sub }}>লোড হচ্ছে...</div>
      </AppLayout>
    );
  }

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "users", label: "ব্যবহারকারী", icon: Users },
    { key: "categories", label: "খরচের ক্যাটেগরি", icon: Tag },
    { key: "audit", label: "অডিট লগ", icon: ScrollText },
    { key: "info", label: "সিস্টেম তথ্য", icon: Info },
  ];

  return (
    <AppLayout>
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck size={20} style={{ color: C.ink }} />
        <h1 className="text-[19px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>অ্যাডমিন প্যানেল</h1>
      </div>

      <div className="flex items-center gap-2 mb-5 border-b" style={{ borderColor: C.border }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition"
            style={{
              borderColor: tab === t.key ? C.gold : "transparent",
              color: tab === t.key ? C.ink : C.sub,
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "audit" && <AuditTab />}
      {tab === "info" && <InfoTab />}
    </AppLayout>
  );
}

/* ---------------------------------- Users ---------------------------------- */

function UsersTab() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("member");
  const [notice, setNotice] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await supabase().from("users").select("*").order("created_at", { ascending: false });
      setUsers(data || []);
    } catch {
      setNotice("ব্যবহারকারীর তালিকা লোড করা যায়নি।");
    }
  }

  const saveRole = async (u: any) => {
    const { error } = await supabase().from("users").update({ role: editRole }).eq("id", u.id);
    if (error) {
      alert("ভূমিকা পরিবর্তন হয়নি: " + error.message);
      return;
    }
    setEditId(null);
    load();
  };

  const removeUser = async (u: any) => {
    if (!confirm(`${u.email} এই ব্যবহারকারী মুছতে চান? একবার মুছলে আর ফেরানো যাবে না।`)) return;
    const { error } = await supabase().from("users").delete().eq("id", u.id);
    if (error) {
      alert("মুছা যায়নি: " + error.message);
      return;
    }
    load();
  };

  return (
    <div>
      <div className="rounded-sm border mb-4 px-4 py-3 text-[12.5px]" style={{ background: C.gold + "1A", borderColor: C.gold, color: C.text }}>
        নতুন কাউকে অ্যাপ ব্যবহারে যোগ করতে চাইলে তাঁকে লগইন পেজে নিজে নিজের অ্যাকাউন্ট তৈরি করতে বলুন, এরপর নিচ থেকে তাঁর ভূমিকা (admin / treasurer / member) সেট করুন।
      </div>

      {notice && <div className="mb-3 text-[12.5px]" style={{ color: C.red }}>{notice}</div>}

      <div className="rounded-sm border overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
        <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[11px] uppercase tracking-wide font-medium" style={{ background: C.page, borderBottom: `1px solid ${C.border}`, color: C.label, fontFamily: "'Hind Siliguri', sans-serif" }}>
          <span className="col-span-5">ইমেইল</span>
          <span className="col-span-4">ভূমিকা</span>
          <span className="col-span-3 text-right">কাজ</span>
        </div>
        {users.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px]" style={{ color: C.sub }}>কোনো ব্যবহারকারী পাওয়া যায়নি</div>
        ) : (
          <div className="divide-y" style={{ borderColor: C.border }}>
            {users.map((u: any) => (
              <div key={u.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3.5">
                <span className="col-span-5 text-[13px]" style={{ color: C.text }}>{u.email}</span>
                <span className="col-span-4">
                  {editId === u.id ? (
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="text-[12.5px] rounded-sm px-2 py-1.5 outline-none"
                      style={{ background: "#fff", border: `1px solid ${C.gold}` }}
                    >
                      <option value="admin">অ্যাডমিন</option>
                      <option value="treasurer">ট্রেজারার</option>
                      <option value="member">সদস্য</option>
                    </select>
                  ) : (
                    <span className="text-[12px] px-2.5 py-1 rounded-full font-medium" style={{ background: roleColors[u.role] + "1A", color: roleColors[u.role] || C.sub }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  )}
                </span>
                <span className="col-span-3 flex items-center justify-end gap-1.5">
                  {editId === u.id ? (
                    <>
                      <button onClick={() => saveRole(u)} className="p-1.5 rounded-sm" style={{ background: C.ink + "14" }}><Check size={13} style={{ color: C.ink }} /></button>
                      <button onClick={() => setEditId(null)} className="p-1.5 rounded-sm" style={{ background: C.sub + "14" }}><X size={13} style={{ color: C.sub }} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(u.id); setEditRole(u.role); }} className="p-1.5 rounded-sm" style={{ background: C.ink + "14" }}><Edit2 size={13} style={{ color: C.ink }} /></button>
                      {u.id !== user?.id && (
                        <button onClick={() => removeUser(u)} className="p-1.5 rounded-sm" style={{ background: C.red + "14" }}><Trash2 size={13} style={{ color: C.red }} /></button>
                      )}
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-3 text-[11.5px]" style={{ color: C.sub }}>
        ভূমিকার অর্থ: অ্যাডমিন — সমস্ত দেখা/জোগ করতে/মুছতে পারবে; ট্রেজারার — দেখা/জোগ করতে পারবে, কিছু মুছতে পারবে না; সদস্য — ড্যাশবোর্ড দেখতে পারবে।
      </p>
    </div>
  );
}

/* ------------------------------ Categories ------------------------------ */

function CategoriesTab() {
  const [cats, setCats] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase().from("expense_categories").select("*").order("is_default", { ascending: false }).order("name");
      setCats(data || []);
    } catch (err) {
      console.error("categories load failed", err);
      setCats([]);
    } finally {
      setLoading(false);
    }
  }

  const addCat = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const { error } = await supabase().from("expense_categories").insert([{ name }]);
    if (error) {
      if (error.message.includes("duplicate")) alert("এই নামের ক্যাটেগরি ইতোমধ্যে আছে।");
      else alert("ক্যাটেগরি যোগ হয়নি: " + error.message);
      return;
    }
    setNewName("");
    load();
  };

  const deleteCat = async (c: any) => {
    if (c.is_default && !confirm("এটি ডিফল্ট ক্যাটেগরি। মুছতে চান?")) return;
    const { error } = await supabase().from("expense_categories").delete().eq("id", c.id);
    if (error) { alert("মুছা যায়নি: " + error.message); return; }
    load();
  };

  const renameCat = async (c: any) => {
    const name = editName.trim();
    if (!name) return setEditingId(null);
    const { error } = await supabase().from("expense_categories").update({ name }).eq("id", c.id);
    if (error) { alert("নাম পরিবর্তন হয়নি: " + error.message); return; }
    setEditingId(null);
    load();
  };

  return (
    <div>
      <div className="rounded-sm border mb-4 px-4 py-3 text-[12.5px]" style={{ background: C.gold + "1A", borderColor: C.gold, color: C.text }}>
        খরচের ক্যাটেগরি তালিকা এখান থেকে বাঁধানো হবে। "নিজস্ব" অপশন থাকায় যেকোনো ফ্রি-টেক্সট ক্যাটেগরিও লিখতে পারবেন।
      </div>

      <form onSubmit={addCat} className="flex items-center gap-2 mb-4">
        <Plus size={15} style={{ color: C.ink }} />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="নতুন ক্যাটেগরির নাম..."
          className="flex-1 rounded-sm px-3 py-2 text-[13px] outline-none"
          style={{ background: "#fff", border: `1px solid ${C.border}` }}
        />
        <button type="submit" className="px-4 py-2 rounded-sm text-[13px] font-semibold hover:brightness-105 transition" style={{ background: C.gold, color: C.ink }}>
          যোগ
        </button>
      </form>

      {loading ? (
        <div className="text-center py-10" style={{ color: C.sub }}>লোড হচ্ছে...</div>
      ) : cats.length === 0 ? (
        <div className="text-center py-10 rounded-sm border" style={{ background: C.paper, borderColor: C.border, color: C.sub }}>
          কোনো ক্যাটেগরি নেই — উপরে নতুন যোগ করুন।
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cats.map((c: any) => (
            <div key={c.id} className="rounded-sm border flex items-center justify-between px-4 py-3" style={{ background: C.paper, borderColor: C.border }}>
              {editingId === c.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus className="flex-1 rounded-sm px-2 py-1.5 text-[13px] outline-none" style={{ background: "#fff", border: `1px solid ${C.gold}` }} onKeyDown={(e) => { if (e.key === "Enter") renameCat(c); if (e.key === "Escape") setEditingId(null); }} />
                  <button onClick={() => renameCat(c)} className="p-1.5 rounded-sm" style={{ background: C.ink + "14" }}><Check size={13} style={{ color: C.ink }} /></button>
                </div>
              ) : (
                <>
                  <span className="text-[13.5px]" style={{ color: C.text }}>{c.name}</span>
                  <div className="flex items-center gap-1">
                    {c.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded-full mr-1" style={{ background: C.ink + "1A", color: C.ink }}>ডিফল্ট</span>}
                    <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} className="p-1.5 rounded-sm hover:brightness-95" style={{ background: C.ink + "14" }}><Edit2 size={12.5} style={{ color: C.ink }} /></button>
                    <button onClick={() => deleteCat(c)} className="p-1.5 rounded-sm hover:brightness-95" style={{ background: C.red + "14" }}><Trash2 size={12.5} style={{ color: C.red }} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- System info ------------------------------- */

function InfoTab() {
  const [counts, setCounts] = useState<{ members: number; donations: number; expenses: number; users: number } | null>(null);
  const [migrated, setMigrated] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [m, d, e, u] = await Promise.all([
          supabase().from("members").select("*", { count: "exact", head: true }),
          supabase().from("donations").select("*", { count: "exact", head: true }),
          supabase().from("expenses").select("*", { count: "exact", head: true }),
          supabase().from("users").select("*", { count: "exact", head: true }),
        ]);
        setCounts({
          members: m.count ?? 0,
          donations: d.count ?? 0,
          expenses: e.count ?? 0,
          users: u.count ?? 0,
        });
      } catch {
        setCounts(null);
      }
      // Detect whether the Phase-1 migration has been applied
      try {
        const { error } = await supabase().from("expense_categories").select("id").limit(1);
        setMigrated(!error);
      } catch {
        setMigrated(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-sm border p-5" style={{ background: C.paper, borderColor: C.border }}>
        <h3 className="text-[14px] font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>
          <Info size={15} /> বর্তমান অবস্থা
        </h3>
        {counts ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "সদস্য", v: counts.members },
              { label: "দান এন্ট্রি", v: counts.donations },
              { label: "খরচ এন্ট্রি", v: counts.expenses },
              { label: "ব্যবহারকারী", v: counts.users },
            ].map((s) => (
              <div key={s.label} className="rounded-sm border px-4 py-3" style={{ borderColor: C.border }}>
                <p className="text-[11px]" style={{ color: C.label }}>{s.label}</p>
                <p className="text-[20px] font-semibold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.ink }}>{s.v}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: C.sub }}>তথ্য লোড হচ্ছে...</p>
        )}
      </div>

      <div className="rounded-sm border p-5" style={{ background: migrated === false ? C.red + "0D" : C.ink + "0D", borderColor: migrated === false ? C.red : C.ink }}>
        <h3 className="text-[14px] font-semibold mb-2 flex items-center gap-2" style={{ fontFamily: "'Tiro Bangla', serif", color: C.text }}>
          <RefreshCw size={15} /> ডেটাবেস মাইগ্রেশন
        </h3>
        {migrated === null ? (
          <p className="text-[13px]" style={{ color: C.sub }}>যাচাই হচ্ছে...</p>
        ) : migrated ? (
          <p className="text-[13px]" style={{ color: C.ink }}>
            মাইগ্রেশন (migration-phase1.sql) সফলভাবে রান করা হয়েছে — ক্যাটেগরি, মাসিক প্রতিশ্রুতি ও মাস-ভিত্তিক দান সব ফিচার কাজ করছে।
          </p>
        ) : (
          <p className="text-[13px]" style={{ color: C.red }}>
            ডেটাবেস মাইগ্রেশন এখনো রান হয়নি। Supabase Dashboard → SQL Editor-এ "migration-phase1.sql" ফাইলের পুরো কন্টেন্ট পেস্ট করে Run করুন। তা না হলে ক্যাটেগরি, মাসিক প্রতিশ্রুতি ও মাস-ভিত্তিক দান ফিচার কাজ করবে না।
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Audit log -------------------------------- */

const ACTION_LABELS: Record<string, string> = {
  "member.insert": "সদস্য যোগ",
  "member.update": "সদস্য আপডেট",
  "member.delete": "সদস্য মুছা",
  "donation.insert": "দান যোগ",
  "donation.delete": "দান মুছা",
  "expense.insert": "খরচ যোগ",
  "expense.delete": "খরচ মুছা",
  "category.insert": "ক্যাটেগরি যোগ",
  "category.delete": "ক্যাটেগরি মুছা",
  "role.update": "ভূমিকা পরিবর্তন",
};

function actionLabel(raw: string): string {
  return ACTION_LABELS[raw] || raw;
}

function AuditTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      // If migration-phase2.sql hasn't been applied yet, this table doesn't
      // exist and the query fails — show a friendly message instead of a crash.
      const { data, error } = await supabase()
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        setMigrationNeeded(true);
        setRows([]);
        return;
      }
      setRows(data || []);
      setMigrationNeeded(false);
    } catch {
      setMigrationNeeded(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const downloadCSV = () => {
    const header = "সময়,কর্তা,ইমেইল,কাজ,টার্গেট টেবিল,রো আইডি,বিবরণ";
    const csvLines = rows.map((r: any) =>
      [
        formatDateBengali(r.created_at || ""),
        r.actor_email || r.actor_id,
        r.actor_email || "",
        actionLabel(r.action),
        r.target_table || "",
        r.target_id || "",
        r.details ? JSON.stringify(r.details).replace(/"/g, "'") : "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob(["\ufeff" + [header, ...csvLines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "audit-log.csv";
    link.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12.5px]" style={{ color: C.sub }}>
          গুরুত্বপূর্ণ কাজের (যোগ / আপডেট / মুছা) ইতিহাস — কে, কখন, কী করেছিলেন।
        </p>
        {rows.length > 0 && (
          <button onClick={downloadCSV} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-sm transition hover:brightness-105" style={{ background: C.ink + "14", color: C.ink }}>
            <Download size={13} /> CSV ডাউনলোড
          </button>
        )}
      </div>

      {migrationNeeded ? (
        <div className="rounded-sm border px-5 py-8 text-center text-[13px]" style={{ background: C.gold + "1A", borderColor: C.gold, color: C.text }}>
          <ScrollText size={20} className="mx-auto mb-2" style={{ color: C.gold }} />
          অডিট লগ চালু হয়নি — সুপাবেস ড্যাশবোর্ডের SQL Editor-এ <strong>migration-phase2.sql</strong> রান করুন, তারপর এই ট্যাবে রেকর্ড আসতে শুরু হবে।
        </div>
      ) : loading ? (
        <div className="text-center py-10" style={{ color: C.sub }}>লোড হচ্ছে...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-10 rounded-sm border" style={{ background: C.paper, borderColor: C.border, color: C.sub }}>
          এখনো কোনো অডিট রেকর্ড নেই — কোনো সদস্য/দান/খরচ যোগ করা হলে এখানে দেখাবে।
        </div>
      ) : (
        <div className="rounded-sm border overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[11px] uppercase tracking-wide font-medium" style={{ background: C.page, borderBottom: `1px solid ${C.border}`, color: C.label, fontFamily: "'Hind Siliguri', sans-serif" }}>
            <span className="col-span-3">সময়</span>
            <span className="col-span-3">কর্তা</span>
            <span className="col-span-3">কাজ</span>
            <span className="col-span-3 text-right">বিবরণ</span>
          </div>
          <div className="divide-y" style={{ borderColor: C.border }}>
            {rows.map((r: any) => (
              <div key={r.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3">
                <span className="col-span-3 text-[11.5px]" style={{ color: C.sub }}>{formatDateBengali(r.created_at || "")}</span>
                <span className="col-span-3 text-[12.5px] truncate" style={{ color: C.text }} title={r.actor_email || r.actor_id}>{r.actor_email || r.actor_id?.slice(0, 8)}</span>
                <span className="col-span-3">
                  <span className="text-[11.5px] px-2 py-0.5 rounded-full font-medium" style={{ background: (r.action?.includes("delete") ? C.red : r.action?.includes("update") ? C.gold : C.ink) + "1A", color: (r.action?.includes("delete") ? C.red : r.action?.includes("update") ? C.gold : C.ink) }}>
                    {actionLabel(r.action)}
                  </span>
                </span>
                <span className="col-span-3 text-[11.5px] text-right truncate" style={{ color: C.label }}>
                  {r.target_table}
                  {r.details?.amount ? ` · ৳${formatMoney(Number(r.details.amount))}` : ""}
                  {r.details?.name ? ` · ${r.details.name}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
