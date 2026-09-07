import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import {
  Wallet, ArrowUpCircle, ArrowDownCircle, Users, Receipt, Stamp, Plus,
  LayoutDashboard, HandCoins, ReceiptText, FileBarChart, Search, Download,
  Phone, MapPin, Calendar, Filter, X,
} from "lucide-react";

/* ---------------- design tokens ---------------- */
const C = {
  ink: "#1B4332",
  paper: "#FBF8F1",
  page: "#EDEAE0",
  border: "#E4DCC8",
  gold: "#C9972D",
  red: "#A63D40",
  text: "#2B2B26",
  sub: "#8A8371",
  label: "#7A7364",
};
const bn = { fontFamily: "'Hind Siliguri', sans-serif" };
const serif = { fontFamily: "'Tiro Bangla', serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };
const num = (n) => "৳" + n.toLocaleString("bn-BD");

/* ---------------- shared bits ---------------- */
function GoogleFonts() {
  return (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Tiro+Bangla&family=JetBrains+Mono:wght@500;600&display=swap');`}</style>
  );
}

function Stub({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="relative rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.12)] border overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />
      <div className="pl-6 pr-5 py-5 flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.14em] uppercase font-medium" style={{ ...bn, color: C.label }}>{label}</p>
          <p className="mt-2 text-[26px] leading-none font-semibold" style={{ ...mono, color: C.text }}>{num(value)}</p>
          <p className="mt-1.5 text-[12px]" style={{ ...bn, color: C.sub }}>{sub}</p>
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: accent + "1A" }}>
          <Icon size={17} strokeWidth={1.8} style={{ color: accent }} />
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-[19px] font-semibold" style={{ ...serif, color: C.text }}>{title}</h1>
      {actionLabel && (
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-sm hover:brightness-105 transition"
          style={{ background: C.gold, color: C.ink }}
        >
          <Plus size={15} strokeWidth={2.5} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

function SearchBar({ placeholder }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border px-3 py-2 mb-4" style={{ background: C.paper, borderColor: C.border }}>
      <Search size={15} style={{ color: C.sub }} />
      <input placeholder={placeholder} className="bg-transparent text-[13px] outline-none flex-1" style={{ ...bn, color: C.text }} />
      <Filter size={14} style={{ color: C.sub }} />
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-sm border ${className}`} style={{ background: C.paper, borderColor: C.border }}>
      {children}
    </div>
  );
}

/* ---------------- mock data ---------------- */
const monthly = [
  { month: "জান", jomা: 42000, khoroch: 18000 },
  { month: "ফেব", jomা: 51000, khoroch: 22000 },
  { month: "মার্চ", jomা: 38000, khoroch: 31000 },
  { month: "এপ্রি", jomা: 64000, khoroch: 27000 },
  { month: "মে", jomা: 58000, khoroch: 41000 },
  { month: "জুন", jomা: 72000, khoroch: 35000 },
];

const entries = [
  { id: "R-0142", name: "রফিকুল ইসলাম", amount: 5000, date: "২২ জুলাই", method: "বিকাশ", type: "in" },
  { id: "E-0031", name: "আসমা বেগমের চিকিৎসা সহায়তা", amount: 12000, date: "২১ জুলাই", method: "নগদ", type: "out" },
  { id: "R-0141", name: "সালমা খাতুন", amount: 2000, date: "২০ জুলাই", method: "নগদ", type: "in" },
  { id: "R-0140", name: "কামাল হোসেন", amount: 10000, date: "১৮ জুলাই", method: "ব্যাংক", type: "in" },
  { id: "E-0030", name: "বন্যার্তদের খাদ্য সহায়তা", amount: 8500, date: "১৭ জুলাই", method: "নগদ", type: "out" },
];

const members = [
  { name: "রফিকুল ইসলাম", phone: "01711-223344", area: "পাঁচলাইশ", joined: "জান ২০২৫", total: 32000, status: "active" },
  { name: "সালমা খাতুন", phone: "01822-334455", area: "চকবাজার", joined: "মার্চ ২০২৫", total: 18500, status: "active" },
  { name: "কামাল হোসেন", phone: "01933-445566", area: "আগ্রাবাদ", joined: "মে ২০২৫", total: 41000, status: "active" },
  { name: "নাজমুল হক", phone: "01644-556677", area: "হালিশহর", joined: "জুন ২০২৪", total: 9000, status: "inactive" },
];

const donations = entries.filter((e) => e.type === "in");
const expenses = [
  { id: "E-0031", title: "আসমা বেগমের চিকিৎসা সহায়তা", category: "চিকিৎসা", amount: 12000, date: "২১ জুলাই ২০২৬" },
  { id: "E-0030", title: "বন্যার্তদের খাদ্য সহায়তা", category: "খাদ্য", amount: 8500, date: "১৭ জুলাই ২০২৬" },
  { id: "E-0029", title: "এতিমখানায় শীতবস্ত্র বিতরণ", category: "জরুরি সহায়তা", amount: 15000, date: "০৫ জুলাই ২০২৬" },
];
const catColor = { "চিকিৎসা": C.red, "খাদ্য": C.gold, "জরুরি সহায়তা": C.ink };

/* ---------------- pages ---------------- */
function DashboardPage() {
  return (
    <>
      <PageHeader title="ড্যাশবোর্ড" actionLabel="নতুন এন্ট্রি" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stub icon={Wallet} label="মোট তহবিল" value={325000} sub="সর্বমোট জমাকৃত অর্থ" accent={C.ink} />
        <Stub icon={ArrowUpCircle} label="মোট খরচ" value={174000} sub="সহায়তায় ব্যয়িত" accent={C.red} />
        <Stub icon={ArrowDownCircle} label="বর্তমান ব্যালেন্স" value={151000} sub="তহবিলে জমা আছে" accent={C.gold} />
      </div>

      <Card className="mt-6 p-6 relative overflow-hidden">
        <div className="absolute left-[52px] top-0 bottom-0 w-px" style={{ background: "#D8A0A0" }} />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold" style={{ ...serif, color: C.text }}>মাসিক জমা ও খরচের হিসাব</h2>
          <div className="flex items-center gap-4 text-[11.5px]" style={{ color: C.label }}>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.ink }} /> জমা</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.gold }} /> খরচ</span>
          </div>
        </div>
        <div className="h-56 pl-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} barGap={4}>
              <CartesianGrid vertical={false} stroke={C.border} />
              <XAxis dataKey="month" tick={{ fill: C.sub, fontSize: 12 }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: C.text, border: "none", borderRadius: 2, fontSize: 12 }} labelStyle={{ color: "#F3EFE2" }} itemStyle={{ color: "#F3EFE2" }} />
              <Bar dataKey="jomা" fill={C.ink} radius={[2, 2, 0, 0]} />
              <Bar dataKey="khoroch" fill={C.gold} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[15px] font-semibold" style={{ ...serif, color: C.text }}>সাম্প্রতিক এন্ট্রি</h2>
          <button className="text-[12.5px] font-medium underline underline-offset-2" style={{ color: C.ink }}>সব দেখুন</button>
        </div>
        <div className="divide-y" style={{ borderColor: C.border }}>
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-6 py-3.5 transition" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: (e.type === "in" ? C.ink : C.red) + "14" }}>
                  <Receipt size={14} strokeWidth={2} style={{ color: e.type === "in" ? C.ink : C.red }} />
                </div>
                <div>
                  <p className="text-[13.5px] font-medium" style={{ color: C.text }}>{e.name}</p>
                  <p className="text-[11.5px]" style={{ color: C.sub }}>{e.id} &middot; {e.date} &middot; {e.method}</p>
                </div>
              </div>
              <p className="text-[14px] font-semibold" style={{ ...mono, color: e.type === "in" ? C.ink : C.red }}>
                {e.type === "in" ? "+" : "−"}{num(e.amount)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function MembersPage() {
  return (
    <>
      <PageHeader title="সদস্য তালিকা" actionLabel="নতুন সদস্য" />
      <SearchBar placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((m) => (
          <Card key={m.phone} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[14.5px] font-semibold" style={{ color: C.text }}>{m.name}</p>
                <p className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: C.sub }}><Phone size={12} /> {m.phone}</p>
                <p className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: C.sub }}><MapPin size={12} /> {m.area}</p>
                <p className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: C.sub }}><Calendar size={12} /> যোগদান: {m.joined}</p>
              </div>
              <span
                className="text-[10.5px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: m.status === "active" ? C.ink + "1A" : C.red + "1A", color: m.status === "active" ? C.ink : C.red }}
              >
                {m.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}
              </span>
            </div>
            <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: C.border }}>
              <span className="text-[11.5px]" style={{ color: C.label }}>মোট দান</span>
              <span className="text-[15px] font-semibold" style={{ ...mono, color: C.ink }}>{num(m.total)}</span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function DonationsPage() {
  return (
    <>
      <PageHeader title="দান এন্ট্রি" actionLabel="নতুন দান যোগ করুন" />
      <SearchBar placeholder="সদস্যের নাম দিয়ে খুঁজুন..." />
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 text-[11px] uppercase tracking-wide font-medium" style={{ ...bn, color: C.label, borderBottom: `1px solid ${C.border}` }}>
          <span>সদস্য</span><span>মাধ্যম</span><span>তারিখ</span><span className="text-right">পরিমাণ</span>
        </div>
        <div className="divide-y" style={{ borderColor: C.border }}>
          {donations.map((d) => (
            <div key={d.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-3.5">
              <div>
                <p className="text-[13.5px] font-medium" style={{ color: C.text }}>{d.name}</p>
                <p className="text-[11px]" style={{ color: C.sub }}>{d.id}</p>
              </div>
              <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: C.gold + "1A", color: C.gold }}>{d.method}</span>
              <span className="text-[12.5px]" style={{ color: C.sub }}>{d.date}</span>
              <div className="flex items-center gap-3 justify-end">
                <span className="text-[14px] font-semibold" style={{ ...mono, color: C.ink }}>{num(d.amount)}</span>
                <button className="p-1.5 rounded-sm hover:brightness-95" style={{ background: C.ink + "14" }} title="রসিদ ডাউনলোড">
                  <Download size={13} style={{ color: C.ink }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function ExpensesPage() {
  return (
    <>
      <PageHeader title="খরচের হিসাব" actionLabel="নতুন খরচ যোগ করুন" />
      <div className="grid grid-cols-1 gap-3">
        {expenses.map((e) => (
          <Card key={e.id} className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: catColor[e.category] + "1A" }}>
                <ReceiptText size={16} style={{ color: catColor[e.category] }} />
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: C.text }}>{e.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium" style={{ background: catColor[e.category] + "1A", color: catColor[e.category] }}>{e.category}</span>
                  <span className="text-[11.5px]" style={{ color: C.sub }}>{e.id} &middot; {e.date}</span>
                </div>
              </div>
            </div>
            <span className="text-[15px] font-semibold" style={{ ...mono, color: C.red }}>−{num(e.amount)}</span>
          </Card>
        ))}
      </div>
    </>
  );
}

function ReportsPage() {
  return (
    <>
      <PageHeader title="রিপোর্ট" actionLabel="এক্সেল এক্সপোর্ট" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stub icon={Wallet} label="এই মাসে জমা" value={72000} sub="জুন ২০২৬" accent={C.ink} />
        <Stub icon={ArrowUpCircle} label="এই মাসে খরচ" value={35000} sub="জুন ২০২৬" accent={C.red} />
        <Stub icon={Users} label="সক্রিয় সদস্য" value={38} sub="মোট নিবন্ধিত ৪২ জন" accent={C.gold} />
      </div>
      <Card className="overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 className="text-[15px] font-semibold" style={{ ...serif, color: C.text }}>মাসিক সারাংশ</h2>
        </div>
        <div className="grid grid-cols-4 gap-4 px-6 py-3 text-[11px] uppercase tracking-wide font-medium" style={{ ...bn, color: C.label, borderBottom: `1px solid ${C.border}` }}>
          <span>মাস</span><span>জমা</span><span>খরচ</span><span className="text-right">নিট</span>
        </div>
        <div className="divide-y" style={{ borderColor: C.border }}>
          {monthly.map((m) => (
            <div key={m.month} className="grid grid-cols-4 gap-4 px-6 py-3">
              <span className="text-[13px]" style={{ color: C.text }}>{m.month}</span>
              <span className="text-[13px]" style={{ ...mono, color: C.ink }}>{num(m.jomা)}</span>
              <span className="text-[13px]" style={{ ...mono, color: C.red }}>{num(m.khoroch)}</span>
              <span className="text-[13px] text-right font-semibold" style={{ ...mono, color: C.text }}>{num(m.jomা - m.khoroch)}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ---------------- shell ---------------- */
const NAV = [
  { key: "dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { key: "members", label: "সদস্য", icon: Users },
  { key: "donations", label: "দান", icon: HandCoins },
  { key: "expenses", label: "খরচ", icon: ReceiptText },
  { key: "reports", label: "রিপোর্ট", icon: FileBarChart },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const Page = {
    dashboard: DashboardPage,
    members: MembersPage,
    donations: DonationsPage,
    expenses: ExpensesPage,
    reports: ReportsPage,
  }[page];

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.page, ...bn }}>
      <GoogleFonts />

      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-56 shrink-0" style={{ background: C.ink }}>
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.gold }}>
            <Stamp size={16} style={{ color: C.ink }} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#F3EFE2]" style={serif}>আশ্রয় সংঘ</p>
            <p className="text-[10.5px] text-[#B8CCC0]">হিসাব খাতা</p>
          </div>
        </div>
        <div className="h-[3px] w-full opacity-50" style={{ backgroundImage: "repeating-linear-gradient(90deg, #C9972D 0 10px, transparent 10px 20px)" }} />
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => {
            const active = page === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setPage(n.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13.5px] transition"
                style={{
                  background: active ? C.gold : "transparent",
                  color: active ? C.ink : "#D8E2DC",
                  fontWeight: active ? 600 : 400,
                }}
              >
                <n.icon size={16} strokeWidth={1.9} />
                {n.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3" style={{ background: C.ink }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: C.gold }}>
            <Stamp size={13} style={{ color: C.ink }} />
          </div>
          <p className="text-[14px] font-semibold text-[#F3EFE2]" style={serif}>আশ্রয় সংঘ</p>
        </div>
        <button onClick={() => setMobileNavOpen(true)} className="text-[#F3EFE2] text-[12px] px-2 py-1 border border-[#F3EFE2]/30 rounded-sm">মেনু</button>
      </div>
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-30" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setMobileNavOpen(false)}>
          <div className="w-64 h-full p-4" style={{ background: C.ink }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <p className="text-[15px] font-semibold text-[#F3EFE2]" style={serif}>মেনু</p>
              <button onClick={() => setMobileNavOpen(false)}><X size={18} className="text-[#F3EFE2]" /></button>
            </div>
            <div className="space-y-1">
              {NAV.map((n) => {
                const active = page === n.key;
                return (
                  <button
                    key={n.key}
                    onClick={() => { setPage(n.key); setMobileNavOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13.5px]"
                    style={{ background: active ? C.gold : "transparent", color: active ? C.ink : "#D8E2DC", fontWeight: active ? 600 : 400 }}
                  >
                    <n.icon size={16} />{n.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 px-6 py-8 md:py-8 pt-20 md:pt-8 max-w-4xl w-full mx-auto">
        <Page />
      </main>
    </div>
  );
}
