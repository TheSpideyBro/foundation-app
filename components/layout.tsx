"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Users, Heart, Wallet, BarChart3, 
  Settings, LogOut, Menu, X, User, Shield, 
  ChevronRight, Bell, Search, History, UserCog
} from "lucide-react";
import { useAuth } from "./providers";
import { getSupabase as supabase } from "@/lib/supabase-client";

const C = {
  emerald: "#1B4332",
  emeraldLight: "#2D6A4F",
  ink: "#0F2922",
  paper: "#F8F9FA",
  accent: "#C9972D",
  text: "#212529",
  sub: "#6C757D",
  white: "#FFFFFF",
  border: "#E9ECEF"
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, phone } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: "ড্যাশবোর্ড", icon: LayoutDashboard, path: "/dashboard", roles: ["admin", "treasurer", "member"] },
    { name: "সদস্য তালিকা", icon: Users, path: "/members", roles: ["admin", "treasurer"] },
    { name: "দান/চাঁদা", icon: Heart, path: "/donations", roles: ["admin", "treasurer", "member"] },
    { name: "খরচ", icon: Wallet, path: "/expenses", roles: ["admin", "treasurer"] },
    { name: "রিপোর্ট", icon: BarChart3, path: "/reports", roles: ["admin", "treasurer"] },
    { name: "আমার প্রোফাইল", icon: User, path: "/profile", roles: ["admin", "treasurer", "member"] },
  ];

  const adminItems = [
    { name: "ইউজার কন্ট্রোল", icon: UserCog, path: "/admin/users" },
    { name: "অডিট লগ", icon: History, path: "/admin/audit" },
  ];

  const handleLogout = async () => {
    await supabase().auth.signOut();
    router.push("/login");
  };

  const activeItem = navItems.find(item => item.path === pathname) || adminItems.find(item => item.path === pathname);

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] font-hind">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#0F2922] text-white fixed h-full shadow-2xl z-50">
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
            <img src="/assets/logo.jpg" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="font-tiro text-[18px] font-bold tracking-tight">দাউলখার</h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[2px]">Foundation</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-white/30 uppercase tracking-[2px] mb-4">প্রধান মেনু</p>
          {navItems.filter(item => item.roles.includes(role || 'member')).map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-medium transition-all duration-300 group ${
                  isActive 
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-black/20' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={18} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                {item.name}
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />}
              </Link>
            );
          })}

          {role === 'admin' && (
            <>
              <p className="px-4 text-[10px] font-bold text-white/30 uppercase tracking-[2px] mt-8 mb-4">অ্যাডমিন কন্ট্রোল</p>
              {adminItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-medium transition-all duration-300 group ${
                      isActive 
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-black/20' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={18} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                {role?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate">{phone || 'User'}</p>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-[12px] font-bold hover:bg-red-500/20 transition-all border border-red-500/20"
            >
              <LogOut size={14} /> লগআউট করুন
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-[18px] font-bold font-tiro text-gray-800">{activeItem?.name || 'ফাউন্ডেশন'}</h2>
              <p className="text-[11px] text-gray-400 font-medium">দাউলখার ফাউন্ডেশন ম্যানেজমেন্ট সিস্টেম</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-gray-100 rounded-xl px-3 py-2 border border-transparent focus-within:border-emerald-500/30 focus-within:bg-white transition-all">
              <Search size={16} className="text-gray-400" />
              <input type="text" placeholder="খুঁজুন..." className="bg-transparent border-none outline-none text-[13px] ml-2 w-48" />
            </div>
            <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <Link href="/profile" className="flex items-center gap-2 p-1.5 pr-3 hover:bg-gray-100 rounded-2xl transition-all border border-transparent hover:border-gray-200">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-[12px] shadow-lg shadow-emerald-600/20">
                {role?.[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[12px] font-bold text-gray-800 leading-none mb-0.5">{phone?.slice(-4) || 'User'}</p>
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">{role}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-8 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0F2922] text-white shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <img src="/assets/logo.jpg" alt="Logo" className="w-8 h-8 object-contain" />
                <span className="font-tiro font-bold">দাউলখার</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.filter(item => item.roles.includes(role || 'member')).map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] ${
                    pathname === item.path ? 'bg-emerald-600 text-white' : 'text-white/60 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
