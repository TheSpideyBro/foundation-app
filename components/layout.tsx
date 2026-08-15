"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, HandCoins, ReceiptText, FileBarChart,
  Stamp, X, LogOut, Menu, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/providers";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

const NAV = [
  { key: "/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { key: "/members", label: "সদস্য", icon: Users },
  { key: "/donations", label: "দান", icon: HandCoins },
  { key: "/expenses", label: "খরচ", icon: ReceiptText },
  { key: "/reports", label: "রিপোর্ট", icon: FileBarChart },
];

export const ADMIN_NAV = {
  key: "/admin",
  label: "অ্যাডমিন",
  icon: ShieldCheck,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeKey = pathname === "/" ? "/dashboard" : pathname;

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 fixed top-0 left-0 bottom-0 z-10" style={{ background: C.ink }}>
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.gold }}>
            <Stamp size={16} style={{ color: C.ink }} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#F3EFE2]" style={{ fontFamily: "'Tiro Bangla', serif" }}>দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন</p>
            <p className="text-[10.5px] text-[#B8CCC0]">হিসাব খাতা</p>
          </div>
        </div>
        <div className="h-[3px] w-full opacity-50" style={{ backgroundImage: "repeating-linear-gradient(90deg, #C9972D 0 10px, transparent 10px 20px)" }} />
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => {
            const active = activeKey === n.key || (n.key !== "/dashboard" && pathname?.startsWith(n.key));
            return (
              <Link
                key={n.key}
                href={n.key}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13.5px] transition hover:brightness-110"
                style={{
                  background: active ? C.gold : "transparent",
                  color: active ? C.ink : "#D8E2DC",
                  fontWeight: active ? 600 : 400,
                }}
              >
                <n.icon size={16} strokeWidth={1.9} />
                {n.label}
              </Link>
            );
          })}
          {role === "admin" && (() => {
            const n = ADMIN_NAV;
            const active = pathname === n.key;
            return (
              <Link
                key={n.key}
                href={n.key}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13.5px] transition hover:brightness-110"
                style={{ background: active ? C.gold : C.gold + "26", color: active ? C.ink : C.gold, fontWeight: 600 }}
              >
                <n.icon size={16} strokeWidth={1.9} />
                {n.label}
              </Link>
            );
          })()}
        </nav>
        <div className="px-3 py-4 border-t" style={{ borderColor: C.gold + "33" }}>
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: C.gold + "33", color: C.gold }}>
              {(user?.email || "U")[0].toUpperCase()}
            </div>
            <span className="text-[11px] truncate flex-1 text-[#B8CCC0]">{user?.email}</span>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-[12px] transition hover:brightness-110" style={{ color: "#D8E2DC" }}>
            <LogOut size={14} /> বের হওন
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3" style={{ background: C.ink }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: C.gold }}>
            <Stamp size={13} style={{ color: C.ink }} />
          </div>
          <p className="text-[14px] font-semibold text-[#F3EFE2]" style={{ fontFamily: "'Tiro Bangla', serif" }}>দৌলখাঁড়</p>
        </div>
        <button onClick={() => setMobileNavOpen(true)} className="text-[#F3EFE2] text-[12px] px-2 py-1 border border-[#F3EFE2]/30 rounded-sm">
          <Menu size={16} />
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-30" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setMobileNavOpen(false)}>
          <div className="w-64 h-full p-4 flex flex-col" style={{ background: C.ink }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <p className="text-[15px] font-semibold text-[#F3EFE2]" style={{ fontFamily: "'Tiro Bangla', serif" }}>মেনু</p>
              <button onClick={() => setMobileNavOpen(false)}><X size={18} className="text-[#F3EFE2]" /></button>
            </div>
            <div className="space-y-1 flex-1">
              {NAV.map((n) => {
                const active = activeKey === n.key || pathname?.startsWith(n.key);
                return (
                  <Link
                    key={n.key}
                    href={n.key}
                    onClick={() => setMobileNavOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13.5px]"
                    style={{ background: active ? C.gold : "transparent", color: active ? C.ink : "#D8E2DC", fontWeight: active ? 600 : 400 }}
                  >
                    <n.icon size={16} />{n.label}
                  </Link>
                );
              })}
              {role === "admin" && (() => {
                const n = ADMIN_NAV;
                const active = pathname === n.key;
                return (
                  <Link
                    key={n.key}
                    href={n.key}
                    onClick={() => setMobileNavOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13.5px]"
                    style={{ background: active ? C.gold : C.gold + "26", color: active ? C.ink : C.gold, fontWeight: 600 }}
                  >
                    <n.icon size={16} />{n.label}
                  </Link>
                );
              })()}
            </div>
            <button onClick={() => { handleSignOut(); setMobileNavOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-sm text-[13px] mt-4 transition hover:brightness-110" style={{ color: "#D8E2DC" }}>
              <LogOut size={16} /> বের হওন
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 px-4 py-6 md:py-8 pt-20 md:pt-8 md:ml-56 max-w-4xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
