"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, Wallet,
  BarChart3, UserCircle, LogOut, Menu, X,
  ShieldCheck, Settings,
  Leaf, Home, History, ReceiptText, BookOpenCheck
} from "lucide-react";
import { useAuth } from "@/components/providers";
import { isAdmin as hasAdminRole, isStaff as hasStaffRole } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, role, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  // Mobile drawer: Escape to close + basic focus trap + focus restoration
  useEffect(() => {
    if (!isSidebarOpen) return;

    // Move focus into the drawer on open (close button is the first focusable)
    drawerCloseRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSidebarOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // U-L7: lock body scroll while the drawer is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      // Return focus to the hamburger on close
      hamburgerRef.current?.focus();
    };
  }, [isSidebarOpen]);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const menuItems = [
    { name: "আমার হিসাব", icon: BookOpenCheck, path: "/amar-hisab", roles: ["member"] },
    { name: "ড্যাশবোর্ড", icon: LayoutDashboard, path: "/dashboard", roles: ["admin", "treasurer", "member"] },
    { name: "সদস্য তালিকা", icon: Users, path: "/members", roles: ["admin", "treasurer", "member"] },
    { name: "জমা এন্ট্রি", icon: ReceiptText, path: "/joma", roles: ["admin", "treasurer"] },
    { name: "দান সংগ্রহ", icon: CreditCard, path: "/donations", roles: ["admin", "treasurer", "member"] },
    { name: "খরচের হিসাব", icon: Wallet, path: "/expenses", roles: ["admin", "treasurer", "member"] },
    { name: "প্রতিবেদন", icon: BarChart3, path: "/reports", roles: ["admin", "treasurer", "member"] },
    { name: "প্রোফাইল", icon: UserCircle, path: "/profile", roles: ["admin", "treasurer", "member"] },
  ];

  const adminItems = [
    { name: "অ্যাডমিন প্যানেল", icon: Settings, path: "/admin", roles: ["admin"] },
    { name: "ইউজার কন্ট্রোল", icon: ShieldCheck, path: "/admin/users", roles: ["admin"] },
    { name: "অডিট লগ", icon: History, path: "/admin/audit", roles: ["admin"] },
    { name: "অঙ্গীকার ইতিহাস", icon: History, path: "/admin/pledge-history", roles: ["admin", "treasurer"] },
  ];

  const isActive = (path: string) => pathname === path;
  // Admin section: a sub-page (e.g. /admin/users/x) keeps its parent link active
  const isSectionActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const isAdminEmail = hasAdminRole(role);
  const isStaff = hasStaffRole(role);

  // Filter items based on current user role
  const visibleMenuItems = menuItems.filter(item => item.roles.includes(role || "") || (isAdminEmail && item.roles.includes("admin")));
  const visibleAdminItems = isAdminEmail ? adminItems : adminItems.filter(item => item.roles.includes(role || ""));

  if (loading && !user) return null;

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col lg:flex-row font-akkas overflow-x-hidden">
      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-b border-emerald-100/50 z-[40] px-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Leaf size={18} fill="currentColor" />
          </div>
          <span className="text-base font-bold text-gray-900 font-shadhinata">দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            ref={hamburgerRef}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-expanded={isSidebarOpen}
            aria-label={isSidebarOpen ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
            className="p-3 min-h-[44px] min-w-[44px] bg-emerald-50 text-emerald-600 rounded-lg active:scale-90 transition-transform"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-emerald-100/50 fixed h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:rotate-6 transition-transform">
              <Leaf size={24} fill="currentColor" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 font-shadhinata">দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল</span>
              <p className="text-[10px] font-bold text-emerald-600">ফাউন্ডেশন</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pt-4 pb-10">
          <p className="px-4 text-[11px] font-bold text-gray-400 mb-4">মেনু</p>
          {visibleMenuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              aria-current={isActive(item.path) ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive(item.path)
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 translate-x-1"
                  : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              <item.icon size={20} className={isActive(item.path) ? "text-white" : "text-gray-400 group-hover:text-emerald-600"} />
              <span className="font-bold text-[15px]">{item.name}</span>
            </Link>
          ))}

          {/* Admin Section in Sidebar */}
          {visibleAdminItems.length > 0 && (
            <>
              <p className="px-4 text-[11px] font-bold text-gray-400 mt-10 mb-4">অ্যাডমিন কন্ট্রোল</p>
              {visibleAdminItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={isSectionActive(item.path) ? "page" : undefined}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                    isSectionActive(item.path)
                      ? "bg-gray-900 text-white shadow-lg shadow-gray-200 translate-x-1"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon size={20} className={isSectionActive(item.path) ? "text-white" : "text-gray-400 group-hover:text-gray-900"} />
                  <span className="font-bold text-[15px]">{item.name}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-6 mt-auto border-t border-emerald-50">
          <div className="bg-emerald-50/50 rounded-3xl p-5 mb-6 flex items-center gap-4 border border-emerald-100/50">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
              {user?.email?.[0].toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] font-bold text-emerald-600">{isStaff ? 'অ্যাডমিন' : 'সদস্য'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-rose-600 hover:bg-rose-50 font-bold text-sm transition-colors border border-rose-100/50"
          >
            <LogOut size={18} />
            লগআউট
          </button>
          <div className="mt-4 text-center">
            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Developed by Saddam Hossain Akash</p>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Navigation (Drawer) */}
      <div 
        className={`lg:hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[50] transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="মেনু"
        inert={!isSidebarOpen}
        className={`lg:hidden fixed top-0 bottom-0 left-0 w-72 bg-white z-[60] transition-transform duration-300 ease-in-out shadow-2xl ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Leaf size={20} fill="currentColor" />
              </div>
              <span className="text-lg font-bold text-gray-900 font-shadhinata">দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন</span>
            </div>
            <button
              ref={drawerCloseRef}
              onClick={() => setIsSidebarOpen(false)}
              aria-label="মেনু বন্ধ করুন"
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-900 active:rotate-90 transition-transform"
            ><X size={24} /></button>
          </div>
          
          <nav className="flex-1 space-y-1.5">
            <p className="px-4 text-[11px] font-bold text-gray-400 mb-4">মেনু</p>
            {visibleMenuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                  isActive(item.path)
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                    : "text-gray-500 hover:bg-emerald-50"
                }`}
              >
                <item.icon size={22} />
                <span className="font-bold text-[16px]">{item.name}</span>
              </Link>
            ))}

            {/* Admin Section in Mobile Drawer */}
            {visibleAdminItems.length > 0 && (
              <>
                <p className="px-4 text-[11px] font-bold text-gray-400 mt-8 mb-4">অ্যাডমিন কন্ট্রোল</p>
                {visibleAdminItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    aria-current={isSectionActive(item.path) ? "page" : undefined}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                      isSectionActive(item.path)
                        ? "bg-gray-900 text-white shadow-lg"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon size={22} />
                    <span className="font-bold text-[16px]">{item.name}</span>
                  </Link>
                ))}
              </>
            )}
          </nav>

          <div className="pt-6 border-t border-gray-100 mt-6 pb-6">
            <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                {user?.email?.[0].toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-bold text-emerald-600">{isStaff ? 'অ্যাডমিন' : 'সদস্য'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl text-rose-600 hover:bg-rose-50 font-bold text-[16px] transition-colors border border-rose-100"
            >
              <LogOut size={22} />
              লগআউট
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="মোবাইল নেভিগেশন"
        className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-emerald-100/50 z-[40] flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
      >
        {role === "member" ? (
          <Link href="/amar-hisab" aria-current={isActive('/amar-hisab') ? "page" : undefined} className={`flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform ${isActive('/amar-hisab') ? 'text-emerald-600' : 'text-gray-400'}`}>
            <BookOpenCheck size={22} />
            <span className="text-[10px] font-bold">হিসাব</span>
          </Link>
        ) : (
          <Link href="/dashboard" aria-current={isActive('/dashboard') ? "page" : undefined} className={`flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform ${isActive('/dashboard') ? 'text-emerald-600' : 'text-gray-400'}`}>
            <Home size={22} />
            <span className="text-[10px] font-bold">হোম</span>
          </Link>
        )}
        <Link href="/donations" aria-current={isActive('/donations') ? "page" : undefined} className={`flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform ${isActive('/donations') ? 'text-emerald-600' : 'text-gray-400'}`}>
          <CreditCard size={22} />
          <span className="text-[10px] font-bold">দান</span>
        </Link>
        {isStaff ? (
          <Link href="/joma" aria-current={isActive('/joma') ? "page" : undefined} className={`flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform ${isActive('/joma') ? 'text-emerald-600' : 'text-gray-400'}`}>
            <ReceiptText size={22} />
            <span className="text-[10px] font-bold">জমা</span>
          </Link>
        ) : (
          <Link href="/expenses" aria-current={isActive('/expenses') ? "page" : undefined} className={`flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform ${isActive('/expenses') ? 'text-emerald-600' : 'text-gray-400'}`}>
            <Wallet size={22} />
            <span className="text-[10px] font-bold">খরচ</span>
          </Link>
        )}
        <Link href="/members" aria-current={isActive('/members') ? "page" : undefined} className={`flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform ${isActive('/members') ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Users size={22} />
          <span className="text-[10px] font-bold">সদস্য</span>
        </Link>
        <Link href="/profile" aria-current={isActive('/profile') ? "page" : undefined} className={`flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform ${isActive('/profile') ? 'text-emerald-600' : 'text-gray-400'}`}>
          <UserCircle size={22} />
          <span className="text-[10px] font-bold">প্রোফাইল</span>
        </Link>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 min-h-screen relative pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="hidden lg:block h-1 bg-emerald-600 w-full fixed top-0 z-20"></div>
        {children}
      </main>
    </div>
  );
}
