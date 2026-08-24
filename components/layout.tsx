"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Users, CreditCard, 
  Wallet, FileText, Settings, LogOut, 
  Menu, X, Bell, Search, ChevronRight,
  Shield, UserCircle, History, UserCheck
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";

interface NavItem {
  name: string;
  path: string;
  icon: any;
  roles: string[];
}

const navItems: NavItem[] = [
  { name: "ড্যাশবোর্ড", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "treasurer", "member"] },
  { name: "সদস্য তালিকা", path: "/members", icon: Users, roles: ["admin", "treasurer"] },
  { name: "দান সংগ্রহ", path: "/donations", icon: CreditCard, roles: ["admin", "treasurer", "member"] },
  { name: "ব্যয় হিসাব", path: "/expenses", icon: Wallet, roles: ["admin", "treasurer"] },
  { name: "রিপোর্ট", path: "/reports", icon: FileText, roles: ["admin", "treasurer"] },
  { name: "ইউজার কন্ট্রোল", path: "/admin/users", icon: UserCheck, roles: ["admin"] },
  { name: "অডিট লগ", path: "/admin/audit", icon: History, roles: ["admin"] },
  { name: "প্রোফাইল", path: "/profile", icon: UserCircle, roles: ["admin", "treasurer", "member"] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase().auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      
      const { data: userData } = await supabase()
        .from("users")
        .select("role, phone")
        .eq("id", session.user.id)
        .single();
      
      setRole(userData?.role || "member");
      setPhone(userData?.phone || session.user.email?.split('@')[0] || "User");
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase().auth.signOut();
    router.push("/login");
  };

  const activeItem = navItems.find(item => item.path === pathname);

  return (
    <div className="flex min-h-screen bg-[#FDFDFC]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-80 bg-[#064E3B] text-white fixed h-screen z-50 shadow-2xl overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-300/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="p-10 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-[1.2rem] p-2 shadow-xl shadow-black/20">
              <img src="/assets/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-tiro text-2xl font-bold tracking-tight">দাউলখার</h1>
              <p className="text-[10px] text-emerald-300/60 uppercase font-bold tracking-widest">ফাউন্ডেশন</p>
            </div>
          </div>

          <nav className="flex-1 px-6 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
            {navItems.filter(item => item.roles.includes(role || 'member')).map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={`group flex items-center gap-4 px-6 py-4 rounded-[1.2rem] text-[15px] font-bold transition-all duration-300 ${
                  pathname === item.path 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' 
                    : 'text-emerald-100/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} className={`transition-transform group-hover:scale-110 ${pathname === item.path ? 'text-white' : 'text-emerald-300/40 group-hover:text-emerald-300'}`} />
                {item.name}
                {pathname === item.path && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>
                )}
              </Link>
            ))}
          </nav>

          <div className="p-8 mt-auto">
            <div className="bg-emerald-900/40 rounded-[2rem] p-6 border border-white/5 backdrop-blur-sm mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center text-emerald-300 font-bold text-lg">
                  {role?.[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold truncate text-white">{phone || 'User'}</p>
                  <div className="flex items-center gap-1.5">
                    <Shield size={10} className="text-emerald-400" />
                    <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-widest">{role}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 text-emerald-200 text-[13px] font-bold hover:bg-rose-500/10 hover:text-rose-300 transition-all border border-white/5 hover:border-rose-500/20"
              >
                <LogOut size={16} /> লগআউট করুন
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-80 min-h-screen flex flex-col relative">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-gray-100/50 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-3 text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-xl font-bold font-tiro text-gray-900">{activeItem?.name || 'ফাউন্ডেশন'}</h2>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                দাউলখার ফাউন্ডেশন ম্যানেজমেন্ট
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-gray-50 rounded-2xl px-4 py-2.5 border border-gray-100 focus-within:border-emerald-500/30 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/5 transition-all w-72">
              <Search size={18} className="text-gray-400" />
              <input type="text" placeholder="খুঁজুন..." className="bg-transparent border-none outline-none text-[14px] ml-3 w-full font-medium" />
            </div>
            
            <button className="p-3 text-gray-500 hover:bg-gray-100 rounded-2xl relative transition-colors group">
              <Bell size={20} className="group-hover:rotate-12 transition-transform" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="w-px h-8 bg-gray-100 mx-2"></div>

            <Link href="/profile" className="flex items-center gap-3 p-1.5 pr-4 hover:bg-gray-50 rounded-[1.2rem] transition-all border border-transparent hover:border-gray-100 group">
              <div className="w-10 h-10 rounded-[1rem] bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                {role?.[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-bold text-gray-900 leading-none mb-1">{phone?.slice(-4) || 'User'}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{role}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 md:p-12 animate-slide-up">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setSidebarOpen(false)}></div>
          <aside className="absolute left-0 top-0 bottom-0 w-80 bg-[#064E3B] text-white shadow-2xl animate-in slide-in-from-left duration-500 ease-out">
            <div className="p-8 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-4">
                <img src="/assets/logo.jpg" alt="Logo" className="w-10 h-10 object-contain bg-white rounded-xl p-1.5" />
                <span className="font-tiro text-2xl font-bold">দাউলখার</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>
            <nav className="p-6 space-y-2 mt-4">
              {navItems.filter(item => item.roles.includes(role || 'member')).map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[16px] font-bold transition-all ${
                    pathname === item.path ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-900/40' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon size={22} />
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
