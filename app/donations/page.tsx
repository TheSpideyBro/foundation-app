"use client";

import { useState, useEffect } from "react";
import { 
  Search, Plus, Filter, Download, 
  Calendar, CreditCard, User, 
  ChevronRight, FileText, 
  MessageSquare, Trash2, Edit2,
  TrendingUp, Heart, Wallet
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";
import Link from "next/link";

export default function DonationsPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchDonations();
  }, []);

  async function fetchDonations() {
    setLoading(true);
    const { data, error } = await supabase()
      .from("donations")
      .select("*, members(name, phone)")
      .order("date", { ascending: false });

    if (!error && data) {
      setDonations(data);
    }
    setLoading(false);
  }

  const filteredDonations = donations.filter(d => 
    (d.members?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     d.donation_month?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterType === "all" || d.method?.toLowerCase() === filterType.toLowerCase())
  );

  const totalAmount = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const thisMonthAmount = donations
    .filter(d => d.date && new Date(d.date).getMonth() === new Date().getMonth())
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  return (
    <AppLayout>
      <div className="touch-spacing pb-20 animate-slide-up">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-widest mb-2 sm:mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div> অর্থ ব্যবস্থাপনা
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 font-tiro leading-tight">অনুদান ও চাঁদা তালিকা</h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">ফাউন্ডেশনের সকল জমার হিসাব।</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="flex-1 sm:flex-none btn-outline px-4 sm:px-6 py-3 text-sm">
              <Download size={18} /> রিপোর্ট
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none btn-emerald px-4 sm:px-8 py-3 text-sm shadow-xl shadow-emerald-600/20"
            >
              <Plus size={18} /> নতুন এন্ট্রি
            </button>
          </div>
        </div>

        {/* Stats Overview - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
          {[
            { label: "মোট সংগৃহীত", value: `৳ ${totalAmount.toLocaleString()}`, icon: TrendingUp, color: "bg-emerald-600", lightColor: "bg-emerald-50" },
            { label: "চলতি মাসের জমা", value: `৳ ${thisMonthAmount.toLocaleString()}`, icon: Calendar, color: "bg-blue-600", lightColor: "bg-blue-50" },
            { label: "মোট দাতা", value: `${new Set(donations.map(d => d.member_id)).size} জন`, icon: User, color: "bg-amber-500", lightColor: "bg-amber-50" }
          ].map((stat, i) => (
            <div key={i} className="card-premium p-6 sm:p-8 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-20 h-20 ${stat.lightColor} rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700`}></div>
              <div className="relative z-10 flex items-center gap-4 sm:gap-6">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 ${stat.color} rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current/20`}>
                  <stat.icon size={24} className="sm:hidden" />
                  <stat.icon size={32} className="hidden sm:block" />
                </div>
                <div>
                  <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 sm:mb-1">{stat.label}</h3>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 font-tiro">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Search - Stack on mobile */}
        <div className="card-premium p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="সদস্যের নাম বা মাস..." 
                className="w-full pl-11 pr-4 py-3 sm:py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 font-medium text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <select 
                className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 font-bold text-xs sm:text-sm text-gray-700 cursor-pointer outline-none"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">সব মাধ্যম</option>
                <option value="cash">নগদ</option>
                <option value="bkash">বিকাশ</option>
                <option value="bank">ব্যাংক</option>
              </select>
              <button className="p-3 sm:p-4 bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-2xl transition-all">
                <Filter size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Donations List - Card layout for mobile, Table for desktop */}
        <div className="space-y-4 sm:space-y-0 sm:table-container">
          {/* Mobile View: Cards */}
          <div className="sm:hidden space-y-4">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="card-premium p-4 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-xl"></div>
                </div>
              ))
            ) : filteredDonations.length === 0 ? (
              <div className="card-premium p-10 text-center">
                <p className="text-gray-400 font-bold font-tiro">কোনো অনুদান পাওয়া যায়নি।</p>
              </div>
            ) : (
              filteredDonations.map((donation) => (
                <div key={donation.id} className="card-premium p-4 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-base">
                        {donation.members?.name?.[0] || "U"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{donation.members?.name || "অজানা সদস্য"}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{donation.members?.phone || "N/A"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-emerald-600 font-tiro">৳ {Number(donation.amount).toLocaleString()}</p>
                      <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">সফল</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-y border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">তারিখ</span>
                      <span className="text-xs font-bold text-gray-700">{donation.date ? new Date(donation.date).toLocaleDateString("bn-BD") : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">মাস</span>
                      <span className="text-xs font-bold text-emerald-600">{donation.donation_month || "সাধারণ"}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">পদ্ধতি</span>
                      <span className="text-xs font-bold text-gray-700 uppercase">{donation.method || "Cash"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => window.open(`/api/receipts/${donation.id}`, "_blank")}
                        className="flex items-center gap-1.5 text-emerald-600 font-bold text-[9px] uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"
                      >
                        <FileText size={12} /> রসিদ
                      </button>
                      <button className="flex items-center gap-1.5 text-blue-600 font-bold text-[9px] uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        <MessageSquare size={12} /> শেয়ার
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-2.5 text-gray-400 bg-gray-50 rounded-lg"><Edit2 size={16} /></button>
                      <button className="p-2.5 text-rose-400 bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="table-header">
                  <th className="px-8 py-6">সদস্যের তথ্য</th>
                  <th className="px-6 py-6 text-center">তারিখ ও মাস</th>
                  <th className="px-6 py-6 text-center">পদ্ধতি</th>
                  <th className="px-6 py-6 text-right">পরিমাণ</th>
                  <th className="px-8 py-6 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-8 py-7"><div className="h-4 bg-gray-100 rounded-full w-40"></div></td>
                      <td className="px-6 py-7"><div className="h-4 bg-gray-100 rounded-full w-24 mx-auto"></div></td>
                      <td className="px-6 py-7"><div className="h-4 bg-gray-100 rounded-full w-20 mx-auto"></div></td>
                      <td className="px-6 py-7"><div className="h-4 bg-gray-100 rounded-full w-16 ml-auto"></div></td>
                      <td className="px-8 py-7"><div className="h-8 bg-gray-100 rounded-xl w-20 mx-auto"></div></td>
                    </tr>
                  ))
                ) : (
                  filteredDonations.map((donation) => (
                    <tr key={donation.id} className="table-row group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform">
                            {donation.members?.name?.[0] || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{donation.members?.name || "অজানা সদস্য"}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{donation.members?.phone || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-bold text-gray-700">{donation.date ? new Date(donation.date).toLocaleDateString("bn-BD") : 'N/A'}</span>
                          <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full mt-1">{donation.donation_month || "সাধারণ"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                          <CreditCard size={12} className="mr-2 text-gray-400" /> {donation.method || "Cash"}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <p className="text-base font-bold text-gray-900 font-tiro">৳ {Number(donation.amount).toLocaleString()}</p>
                        <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">সফল</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => window.open(`/api/receipts/${donation.id}`, "_blank")}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          >
                            <FileText size={18} />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <MessageSquare size={18} />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
