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
      <div className="space-y-10 pb-20 animate-slide-up">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div> অর্থ ব্যবস্থাপনা
            </div>
            <h1 className="text-4xl font-bold text-gray-900 font-tiro leading-tight">অনুদান ও চাঁদা তালিকা</h1>
            <p className="text-gray-500 font-medium mt-2">ফাউন্ডেশনের সকল জমার হিসাব এখানে সংরক্ষিত আছে।</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-outline px-6 py-3.5 text-sm">
              <Download size={18} /> রিপোর্ট ডাউনলোড
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-emerald px-8 py-3.5 text-sm shadow-xl shadow-emerald-600/20"
            >
              <Plus size={18} /> নতুন এন্ট্রি
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card-premium p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 mb-6">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">মোট সংগৃহীত</h3>
              <p className="text-3xl font-bold text-gray-900 font-tiro">৳ {totalAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="card-premium p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-6">
                <Calendar size={28} />
              </div>
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">চলতি মাসের জমা</h3>
              <p className="text-3xl font-bold text-gray-900 font-tiro">৳ {thisMonthAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="card-premium p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 mb-6">
                <User size={28} />
              </div>
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">মোট দাতা</h3>
              <p className="text-3xl font-bold text-gray-900 font-tiro">{new Set(donations.map(d => d.member_id)).size} জন</p>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="card-premium p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="সদস্যের নাম বা মাস দিয়ে খুঁজুন..." 
                className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 font-medium text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <select 
                className="px-6 py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 font-bold text-sm text-gray-700 cursor-pointer outline-none"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">সব মাধ্যম</option>
                <option value="cash">নগদ (Cash)</option>
                <option value="bkash">বিকাশ (bKash)</option>
                <option value="bank">ব্যাংক (Bank)</option>
              </select>
              <button className="p-4 bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-2xl transition-all">
                <Filter size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
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
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-8 py-7"><div className="h-4 bg-gray-100 rounded-full w-40"></div></td>
                      <td className="px-6 py-7"><div className="h-4 bg-gray-100 rounded-full w-24 mx-auto"></div></td>
                      <td className="px-6 py-7"><div className="h-4 bg-gray-100 rounded-full w-20 mx-auto"></div></td>
                      <td className="px-6 py-7"><div className="h-4 bg-gray-100 rounded-full w-16 ml-auto"></div></td>
                      <td className="px-8 py-7"><div className="h-8 bg-gray-100 rounded-xl w-20 mx-auto"></div></td>
                    </tr>
                  ))
                ) : filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200">
                          <Search size={48} />
                        </div>
                        <p className="text-gray-400 font-bold font-tiro text-lg">কোনো অনুদান পাওয়া যায়নি।</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDonations.map((donation) => (
                    <tr key={donation.id} className="table-row group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform">
                            {donation.members?.name?.[0] || "U"}
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-gray-900">{donation.members?.name || "অজানা সদস্য"}</p>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{donation.members?.phone || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-[13px] font-bold text-gray-700">{donation.date ? new Date(donation.date).toLocaleDateString("bn-BD") : 'N/A'}</span>
                          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full mt-1">{donation.donation_month || "সাধারণ"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-[11px] font-bold uppercase tracking-widest">
                          <CreditCard size={12} className="mr-2 text-gray-400" /> {donation.method || "Cash"}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <p className="text-[18px] font-bold text-gray-900 font-tiro">৳ {Number(donation.amount).toLocaleString()}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">সফল</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => window.open(`/api/receipts/${donation.id}`, "_blank")}
                            className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                            title="রসিদ দেখুন"
                          >
                            <FileText size={20} />
                          </button>
                          <button className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all" title="শেয়ার করুন">
                            <MessageSquare size={20} />
                          </button>
                          <div className="w-[1px] h-6 bg-gray-100 mx-1"></div>
                          <button className="p-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all">
                            <Trash2 size={20} />
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
