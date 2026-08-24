"use client";

import { useState, useEffect } from "react";
import { 
  Search, Plus, Filter, Download, 
  Calendar, CreditCard, User, 
  ChevronRight, ArrowRight, FileText, 
  MessageSquare, Trash2, Edit2, MoreVertical,
  CheckCircle2, Clock, AlertCircle, TrendingUp
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function DonationsPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchDonations();
  }, []);

  async function fetchDonations() {
    setLoading(true);
    const { data, error } = await supabase
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
     d.purpose?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterType === "all" || d.method?.toLowerCase() === filterType.toLowerCase())
  );

  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
  const thisMonthAmount = donations
    .filter(d => new Date(d.date).getMonth() === new Date().getMonth())
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-[0.2em] mb-3">
            <CreditCard size={14} /> অর্থ ব্যবস্থাপনা
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium p-8 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">সর্বমোট</span>
          </div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">মোট সংগৃহীত</h3>
          <p className="text-3xl font-bold text-gray-900 font-tiro">৳ {totalAmount.toLocaleString()}</p>
        </div>

        <div className="card-premium p-8 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">এই মাস</span>
          </div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">চলতি মাসের জমা</h3>
          <p className="text-3xl font-bold text-gray-900 font-tiro">৳ {thisMonthAmount.toLocaleString()}</p>
        </div>

        <div className="card-premium p-8 border-l-4 border-l-amber-600">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <User size={24} />
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-wider">সদস্য</span>
          </div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">মোট দাতা</h3>
          <p className="text-3xl font-bold text-gray-900 font-tiro">{new Set(donations.map(d => d.member_id)).size} জন</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card-premium p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="সদস্যের নাম বা উদ্দেশ্য দিয়ে খুঁজুন..." 
              className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-medium text-gray-900 placeholder:text-gray-400 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-bold text-sm text-gray-700 cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">সব মাধ্যম</option>
              <option value="cash">নগদ (Cash)</option>
              <option value="bkash">বিকাশ (bKash)</option>
              <option value="bank">ব্যাংক (Bank)</option>
            </select>
            <button className="p-4 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">
              <Filter size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">সদস্যের তথ্য</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">তারিখ</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">উদ্দেশ্য</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">পরিমাণ</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-40"></div></td>
                    <td className="px-6 py-6 text-right"><div className="h-4 bg-gray-100 rounded w-16 ml-auto"></div></td>
                    <td className="px-6 py-6 text-center"><div className="h-8 bg-gray-100 rounded-lg w-20 mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                        <Search size={40} />
                      </div>
                      <p className="text-gray-500 font-medium">কোনো অনুদান পাওয়া যায়নি।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDonations.map((donation) => (
                  <tr key={donation.id} className="group hover:bg-emerald-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
                          {donation.members?.name?.[0] || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{donation.members?.name || "অজানা সদস্য"}</p>
                          <p className="text-[10px] text-gray-400 font-medium tracking-wide">{donation.members?.phone || "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-xs font-medium">{new Date(donation.date).toLocaleDateString("bn-BD")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        {donation.purpose || "মাসিক চাঁদা"}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <p className="text-sm font-bold text-gray-900">৳ {donation.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{donation.method || "Cash"}</p>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => window.open(`/api/receipts/${donation.id}`, "_blank")}
                          className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                          title="রসিদ দেখুন"
                        >
                          <FileText size={18} />
                        </button>
                        <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors" title="শেয়ার করুন">
                          <MessageSquare size={18} />
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
  );
}
