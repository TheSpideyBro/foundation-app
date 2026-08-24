"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Users, CreditCard, Wallet, 
  BarChart3, UserCircle, LogOut, Menu, X,
  ShieldCheck, Settings, Bell, Search,
  Heart, Leaf, Home
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase().auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: userData } = await supabase()
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();
        setRole(userData?.role || "member");
      } else {
        router.push("/login");
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase().auth.signOut();
    router.push("/login");
  };

  const menuItems = [
    { name: "ড্যাশবোর্ড", icon: LayoutDashboard, path: "/dashboard", roles: ["admin", "treasurer", "member"] },
    { name: "সদস্য তালিকা", icon: Users, path: "/members", roles: ["admin", "treasurer"] },
    { name: "দান সংগ্রহ", icon: CreditCard, path: "/donations", roles: ["admin", "treasurer", "member"] },
    { name: "খরচের হিসাব", icon: Wallet, path: "/expenses", roles: ["admin", "treasurer"] },
    { name: "প্রতিবেদন", icon: BarChart3, path: "/reports", roles: ["admin", "treasurer"] },
    { name: "প্রোফাইল", icon: UserCircle, path: "/profile", roles: ["admin", "treasurer", "member"] },
  ];

  const adminItems = [
    { name: "ইউজার কন্ট্রোল", icon: ShieldCheck, path: "/admin/users", roles: ["admin"] },
    { name: "অডিট লগ", icon: Settings, path: "/admin/audit", roles: ["admin"] },
  ];

  const isActive = (path: string) => pathname === path;

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(role || ""));
  const visibleAdminItems = adminItems.filter(item => item.roles.includes(role || ""));

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col lg:flex-row font-hind">
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-emerald-100/50 z-[40] px-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Leaf size={18} fill="currentColor" />
          </div>
          <span className="text-md font-bold text-gray-900 font-tiro tracking-tight">দৌলখার ফাউন্ডেশন</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-500"><Bell size={20} /></button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"
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
              <span className="text-xl font-bold text-gray-900 tracking-tight font-tiro">দৌলখার</span>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">ফাউন্ডেশন</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pt-4">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">মেনু</p>
          {visibleMenuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive(item.path)
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 translate-x-1"
                  : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              <item.icon size={20} className={isActive(item.path) ? "text-white" : "text-gray-400 group-hover:text-emerald-600"} />
              <span className="font-bold text-[15px] tracking-tight">{item.name}</span>
            </Link>
          ))}

          {role === "admin" && (
            <>
              <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-10 mb-4">অ্যাডমিন</p>
              {visibleAdminItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                    isActive(item.path)
                      ? "bg-gray-900 text-white shadow-lg shadow-gray-200 translate-x-1"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon size={20} className={isActive(item.path) ? "text-white" : "text-gray-400 group-hover:text-gray-900"} />
                  <span className="font-bold text-[15px] tracking-tight">{item.name}</span>
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
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{role === 'admin' ? 'অ্যাডমিন' : 'সদস্য'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-rose-600 hover:bg-rose-50 font-bold text-sm transition-colors border border-rose-100/50"
          >
            <LogOut size={18} />
            লগআউট
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Navigation (Drawer) */}
      <div 
        className={`lg:hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[50] transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <aside className={`lg:hidden fixed top-0 bottom-0 left-0 w-72 bg-white z-[60] transition-transform duration-300 ease-in-out shadow-2xl ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Leaf size={20} fill="currentColor" />
              </div>
              <span className="text-lg font-bold text-gray-900 font-tiro">দৌলখার</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-400 hover:text-gray-900"><X size={24} /></button>
          </div>
          
          <nav className="flex-1 space-y-1.5 overflow-y-auto">
            <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">মেনু</p>
            {visibleMenuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
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

            {role === "admin" && (
              <>
                <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-8 mb-4">অ্যাডমিন</p>
                {visibleAdminItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                      isActive(item.path)
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

          <div className="pt-6 border-t border-gray-100 mt-6">
            <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                {user?.email?.[0].toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{role === 'admin' ? 'অ্যাডমিন' : 'সদস্য'}</p>
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-emerald-100/50 z-[40] flex items-center justify-around px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 p-2 ${isActive('/dashboard') ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Home size={22} />
          <span className="text-[10px] font-bold">হোম</span>
        </Link>
        <Link href="/donations" className={`flex flex-col items-center gap-1 p-2 ${isActive('/donations') ? 'text-emerald-600' : 'text-gray-400'}`}>
          <CreditCard size={22} />
          <span className="text-[10px] font-bold">দান</span>
        </Link>
        <Link href="/members" className={`flex flex-col items-center gap-1 p-2 ${isActive('/members') ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Users size={22} />
          <span className="text-[10px] font-bold">সদস্য</span>
        </Link>
        <Link href="/profile" className={`flex flex-col items-center gap-1 p-2 ${isActive('/profile') ? 'text-emerald-600' : 'text-gray-400'}`}>
          <UserCircle size={22} />
          <span className="text-[10px] font-bold">প্রোফাইল</span>
        </Link>
        <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center gap-1 p-2 text-gray-400">
          <Menu size={22} />
          <span className="text-[10px] font-bold">আরও</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 min-h-screen relative pb-20 lg:pb-0">
        {/* Top Decorative Bar */}
        <div className="hidden lg:block h-1 bg-emerald-600 w-full sticky top-0 z-20"></div>
        
        {/* Desktop Top Navbar */}
        <div className="hidden lg:flex items-center justify-between px-10 h-20 bg-white/50 backdrop-blur-sm sticky top-1 z-10">
          <div className="flex items-center gap-6 flex-1">
            <div className="relative max-w-md w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="সদস্য বা লেনদেন খুঁজুন..." 
                className="w-full bg-white border border-emerald-100/50 rounded-2xl py-2.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-11 h-11 rounded-xl bg-white border border-emerald-100/50 flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-emerald-100/50 mx-2"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900 leading-tight">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{role === 'admin' ? 'অ্যাডমিন' : 'সদস্য'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-200">
                {user?.email?.[0].toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="p-4 sm:p-6 lg:p-12">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
