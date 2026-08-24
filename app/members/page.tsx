"use client";

import { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, Filter, 
  MoreVertical, Edit, Trash2, Link as LinkIcon, 
  Unlink, CheckCircle, XCircle, ChevronRight,
  Download, Mail, Phone, MapPin, ExternalLink,
  ShieldCheck, Activity, Award
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: membersData } = await supabase()
        .from("members")
        .select("*, users(email, phone, is_approved)")
        .order("name");
      
      setMembers(membersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.phone?.includes(searchTerm);
    const matchesStatus = filterStatus === "all" || m.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="touch-spacing pb-20 animate-slide-up">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-widest mb-2 sm:mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div> ফাউন্ডেশন পরিবার
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 font-tiro leading-tight">সদস্য ব্যবস্থাপনা</h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">ফাউন্ডেশনের সকল নিবন্ধিত সদস্যদের তথ্য।</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="flex-1 sm:flex-none btn-outline px-4 sm:px-6 py-3 text-sm">
              <Download size={18} /> এক্সপোর্ট
            </button>
            <button className="flex-1 sm:flex-none btn-emerald px-4 sm:px-8 py-3 text-sm shadow-xl shadow-emerald-600/20">
              <UserPlus size={18} /> নতুন সদস্য
            </button>
          </div>
        </div>

        {/* Stats Overview - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
          {[
            { label: "মোট সদস্য", value: `${members.length} জন`, icon: Users, color: "bg-emerald-600", lightColor: "bg-emerald-50" },
            { label: "সক্রিয় সদস্য", value: `${members.filter(m => m.status?.toLowerCase() === 'active').length} জন`, icon: CheckCircle, color: "bg-blue-600", lightColor: "bg-blue-50" },
            { label: "লিঙ্কড ইউজার", value: `${members.filter(m => m.user_id).length} জন`, icon: LinkIcon, color: "bg-amber-500", lightColor: "bg-amber-50" }
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
                placeholder="সদস্যের নাম বা ফোন নম্বর..." 
                className="w-full pl-11 pr-4 py-3 sm:py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 font-medium text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <select 
                className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 font-bold text-xs sm:text-sm text-gray-700 cursor-pointer outline-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">সব স্ট্যাটাস</option>
                <option value="active">সক্রিয়</option>
                <option value="inactive">নিষ্ক্রিয়</option>
              </select>
              <button className="p-3 sm:p-4 bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-2xl transition-all">
                <Filter size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Members List - Card layout for mobile, Table for desktop */}
        <div className="space-y-4 sm:space-y-0 sm:table-container">
          {/* Mobile View: Cards */}
          <div className="sm:hidden space-y-4">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="card-premium p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-8 bg-gray-100 rounded-xl"></div>
                    <div className="h-8 bg-gray-100 rounded-xl"></div>
                  </div>
                </div>
              ))
            ) : filteredMembers.length === 0 ? (
              <div className="card-premium p-10 text-center">
                <p className="text-gray-400 font-bold font-tiro">কোনো সদস্য পাওয়া যায়নি।</p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div key={member.id} className="card-premium p-4 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-lg">
                        {member.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{member.name}</p>
                        <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                          <Award size={10} /> {member.role || 'সদস্য'}
                        </p>
                      </div>
                    </div>
                    <span className={`badge-${member.status?.toLowerCase() === 'active' ? 'emerald' : 'rose'} px-2.5 py-1 text-[9px]`}>
                      {member.status?.toLowerCase() === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 py-2 border-y border-gray-50">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                      <Phone size={12} className="text-emerald-500" />
                      {member.phone}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400">
                      <MapPin size={10} />
                      {member.address || 'ঠিকানা নেই'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {member.user_id ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[9px] uppercase tracking-wider bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                        <ShieldCheck size={12} /> লিঙ্কড
                      </div>
                    ) : (
                      <button className="flex items-center gap-1.5 text-amber-600 font-bold text-[9px] uppercase tracking-wider bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
                        <LinkIcon size={12} /> লিঙ্ক
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      <button className="p-2.5 text-gray-400 bg-gray-50 rounded-lg"><Edit size={16} /></button>
                      <button className="p-2.5 text-rose-400 bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                      <button className="p-2.5 text-emerald-600 bg-emerald-50 rounded-lg"><ChevronRight size={16} /></button>
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
                  <th className="px-8 py-6">সদস্যের নাম ও রোল</th>
                  <th className="px-6 py-6">যোগাযোগের তথ্য</th>
                  <th className="px-6 py-6 text-center">স্ট্যাটাস</th>
                  <th className="px-6 py-6 text-center">অ্যাকাউন্ট</th>
                  <th className="px-8 py-6 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-8 py-7"><div className="h-10 bg-gray-100 rounded-2xl w-48"></div></td>
                      <td className="px-6 py-7"><div className="h-10 bg-gray-100 rounded-2xl w-40"></div></td>
                      <td className="px-6 py-7"><div className="h-6 bg-gray-100 rounded-full w-20 mx-auto"></div></td>
                      <td className="px-6 py-7"><div className="h-6 bg-gray-100 rounded-full w-24 mx-auto"></div></td>
                      <td className="px-8 py-7"><div className="h-8 bg-gray-100 rounded-xl w-24 mx-auto"></div></td>
                    </tr>
                  ))
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="table-row group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                            {member.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{member.name}</p>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                              <Award size={12} /> {member.role || 'সদস্য'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                            <Phone size={14} className="text-emerald-500" />
                            {member.phone}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                            <MapPin size={12} />
                            {member.address || 'ঠিকানা নেই'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`badge-${member.status?.toLowerCase() === 'active' ? 'emerald' : 'rose'} px-3 py-1.5`}>
                          {member.status?.toLowerCase() === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center">
                        {member.user_id ? (
                          <div className="inline-flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                            <ShieldCheck size={14} /> লিঙ্কড
                          </div>
                        ) : (
                          <button className="inline-flex items-center gap-2 text-amber-600 font-bold text-[10px] uppercase tracking-wider bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors">
                            <LinkIcon size={14} /> লিঙ্ক
                          </button>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Edit size={18} /></button>
                          <button className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                          <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"><ChevronRight size={18} /></button>
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
