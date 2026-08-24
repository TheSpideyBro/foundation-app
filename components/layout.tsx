"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Users, CreditCard, Wallet, 
  BarChart3, UserCircle, LogOut, Menu, X,
  ShieldCheck, Settings, Bell, Search,
  Heart, Leaf
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
      }
    };
    checkUser();
  }, []);

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

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex font-hind">
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
          {menuItems.filter(item => item.roles.includes(role || "")).map((item) => (
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
              {adminItems.map((item) => (
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

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-emerald-100/50 z-30 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Leaf size={20} fill="currentColor" />
          </div>
          <span className="text-lg font-bold text-gray-900 font-tiro tracking-tight">দৌলখার</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Content */}
      <aside className={`lg:hidden fixed top-0 bottom-0 left-0 w-80 bg-white z-50 transition-transform duration-500 ease-in-out shadow-2xl ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Same content as desktop sidebar but adapted for mobile if needed */}
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Leaf size={20} fill="currentColor" />
              </div>
              <span className="text-xl font-bold text-gray-900 font-tiro">দৌলখার</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400"><X size={24} /></button>
          </div>
          
          <nav className="flex-1 space-y-2">
            {menuItems.filter(item => item.roles.includes(role || "")).map((item) => (
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
                <span className="font-bold text-lg">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="pt-8 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl text-rose-600 hover:bg-rose-50 font-bold text-lg transition-colors border border-rose-100"
            >
              <LogOut size={22} />
              লগআউট
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 min-h-screen relative">
        {/* Top Decorative Bar */}
        <div className="h-1 bg-emerald-600 w-full sticky top-0 z-20"></div>
        
        {/* Top Navbar */}
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

        <div className="p-6 lg:p-12 mt-20 lg:mt-0">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
