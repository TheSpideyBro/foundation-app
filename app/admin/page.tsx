"use client";

import { useState } from "react";
import { 
  Users, Shield, History, Settings, 
  Database, RefreshCw, Download, 
  ChevronRight, AlertTriangle, CheckCircle2,
  Lock, Smartphone, UserPlus,
  Clock, Megaphone, Tag
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers";

export default function AdminPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email === 'saddamakash234@gmail.com';
  const isStaff = isAdmin || role === 'treasurer';
  
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const response = await fetch('/api/sync-sheets', { method: 'POST' });
      const data = await response.json();
      if (data.ok || data.success) {
        setMessage({ type: 'success', text: 'গুগল শিটের সাথে সফলভাবে সিঙ্ক হয়েছে!' });
      } else {
        throw new Error(data.error || 'সিঙ্ক ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `সিঙ্ক ব্যর্থ: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  if (!isStaff) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-red-100">
          <Shield size={40} />
        </div>
        <h1 className="text-2xl font-bold font-tiro text-gray-900 mb-2">প্রবেশাধিকার সংরক্ষিত</h1>
        <p className="text-gray-500 max-w-xs">এই পেজটি শুধুমাত্র অ্যাডমিন ও ট্রেজারারদের জন্য। আপনার যদি মনে হয় এটি ভুল, তবে প্রধান অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
      </div>
    );
  }

  const adminTools = [
    ...(isAdmin ? [{
      title: "ইউজার ম্যানেজমেন্ট",
      desc: "ইউজারদের রোল এবং অ্যাপ্রুভাল নিয়ন্ত্রণ করুন",
      icon: <Users size={24} />,
      link: "/admin/users",
      color: "blue"
    }] : []),
    {
      title: "অডিট লগ",
      desc: "সিস্টেমের সকল কার্যক্রমের ইতিহাস দেখুন",
      icon: <History size={24} />,
      link: "/admin/audit",
      color: "emerald"
    },
    {
      title: "বাকি চাঁদার তালিকা",
      desc: "অনাদায়ী অঙ্গীকার এবং হোয়াটসঅ্যাপ রিমাইন্ডার",
      icon: <Clock size={24} />,
      link: "/admin/pending",
      color: "rose"
    },
    {
      title: "নোটিশ বোর্ড",
      desc: "সদস্যদের জন্য ঘোষণা এবং আপডেট তৈরি করুন",
      icon: <Megaphone size={24} />,
      link: "/admin/notices",
      color: "amber"
    },
    {
      title: "ক্যাটাগরি ম্যানেজমেন্ট",
      desc: "খরচের ক্যাটাগরিগুলো নিয়ন্ত্রণ করুন",
      icon: <Tag size={24} />,
      link: "/admin/categories",
      color: "blue"
    },
    {
      title: "বাল্ক ইম্পোর্ট/এক্সপোর্ট",
      desc: "এক্সেল ফাইলের মাধ্যমে ডাটা ব্যাকআপ ও আপলোড",
      icon: <Database size={24} />,
      link: "/admin/bulk",
      color: "emerald"
    },
    {
      title: "অটো-লিঙ্ক সদস্য",
      desc: "ফোন নম্বর অনুযায়ী মেম্বারদের অটো-লিঙ্ক করুন",
      icon: <UserPlus size={24} />,
      action: async () => {
        const res = await fetch('/api/admin/auto-link', { method: 'POST' }).then(r => r.json());
        if (res.error) alert("লিঙ্ক করতে সমস্যা হয়েছে: " + res.error);
        else alert(`সফলভাবে ${res.linkedCount || res.count || 0} জন সদস্যকে লিঙ্ক করা হয়েছে।`);
      },
      color: "purple"
    }
  ];

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 touch-spacing">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-tiro text-gray-900 mb-1">অ্যাডমিন প্যানেল</h1>
          <p className="text-sm text-gray-500 font-medium">ফাউন্ডেশনের প্রশাসনিক নিয়ন্ত্রণ কেন্দ্র</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-premium p-6 sm:p-8 border border-emerald-50 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-start justify-between mb-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
              <RefreshCw size={24} className={syncing ? "animate-spin" : ""} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 font-tiro">গুগল শিট সিঙ্ক</h3>
          <p className="text-gray-500 text-sm mb-6 font-medium">ফাউন্ডেশনের সব ডাটা গুগল শিটের সাথে সিঙ্ক করুন যাতে ব্যাকআপ এবং রিপোর্ট তৈরি করা সহজ হয়।</p>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="w-full btn-emerald h-14 text-base"
          >
            {syncing ? "সিঙ্ক হচ্ছে..." : "এখনই সিঙ্ক করুন"}
          </button>
        </div>

        <div className="card-premium p-6 sm:p-8 border border-blue-50 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-start justify-between mb-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
              <Database size={24} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 font-tiro">ডাটা ব্যাকআপ</h3>
          <p className="text-gray-500 text-sm mb-6 font-medium">পুরো সিস্টেমের একটি ব্যাকআপ ফাইল ডাউনলোড করুন। এটি যেকোনো সময় ডাটা রিস্টোর করতে সাহায্য করবে।</p>
          <button 
            onClick={() => alert("ব্যাকআপ তৈরির ফিচারটি প্রসেস করা হচ্ছে...")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold h-14 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            ব্যাকআপ ডাউনলোড করুন
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[15px] font-bold text-gray-400 uppercase tracking-widest ml-1">প্রশাসনিক টুলস</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminTools.map((tool, idx) => (
            tool.link ? (
              <Link key={idx} href={tool.link} className="card-premium p-6 hover:bg-gray-50 transition-all group border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      tool.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                      tool.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {tool.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{tool.title}</h4>
                      <p className="text-[11px] text-gray-400 font-medium">{tool.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
                </div>
              </Link>
            ) : (
              <button key={idx} onClick={tool.action} className="card-premium p-6 hover:bg-gray-50 transition-all group border border-gray-100 shadow-sm text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      tool.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                      tool.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {tool.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{tool.title}</h4>
                      <p className="text-[11px] text-gray-400 font-medium">{tool.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
                </div>
              </button>
            )
          ))}
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-gray-100 text-center">
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
          System Developed & Maintained by Saddam Hossain Akash
        </p>
      </div>
    </div>
  );
}
