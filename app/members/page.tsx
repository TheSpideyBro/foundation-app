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
      <div className="space-y-10 pb-20 animate-slide-up">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div> ফাউন্ডেশন পরিবার
            </div>
            <h1 className="text-4xl font-bold text-gray-900 font-tiro leading-tight">সদস্য ব্যবস্থাপনা</h1>
            <p className="text-gray-500 font-medium mt-2">ফাউন্ডেশনের সকল নিবন্ধিত সদস্যদের তথ্য ও কার্যক্রম।</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-outline px-6 py-3.5 text-sm">
              <Download size={18} /> এক্সপোর্ট
            </button>
            <button className="btn-emerald px-8 py-3.5 text-sm shadow-xl shadow-emerald-600/20">
              <UserPlus size={18} /> নতুন সদস্য
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card-premium p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <Users size={32} />
              </div>
              <div>
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">মোট সদস্য</h3>
                <p className="text-3xl font-bold text-gray-900 font-tiro">{members.length} জন</p>
              </div>
            </div>
          </div>

          <div className="card-premium p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <CheckCircle size={32} />
              </div>
              <div>
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">সক্রিয় সদস্য</h3>
                <p className="text-3xl font-bold text-gray-900 font-tiro">{members.filter(m => m.status?.toLowerCase() === 'active').length} জন</p>
              </div>
            </div>
          </div>

          <div className="card-premium p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                <LinkIcon size={32} />
              </div>
              <div>
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">লিঙ্কড ইউজার</h3>
                <p className="text-3xl font-bold text-gray-900 font-tiro">{members.filter(m => m.user_id).length} জন</p>
              </div>
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
                placeholder="সদস্যের নাম বা ফোন নম্বর দিয়ে খুঁজুন..." 
                className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 font-medium text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <select 
                className="px-6 py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 font-bold text-sm text-gray-700 cursor-pointer outline-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">সব স্ট্যাটাস</option>
                <option value="active">সক্রিয়</option>
                <option value="inactive">নিষ্ক্রিয়</option>
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
            <table className="w-full text-left border-collapse min-w-[900px]">
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
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-8 py-7"><div className="h-10 bg-gray-100 rounded-2xl w-48"></div></td>
                      <td className="px-6 py-7"><div className="h-10 bg-gray-100 rounded-2xl w-40"></div></td>
                      <td className="px-6 py-7"><div className="h-6 bg-gray-100 rounded-full w-20 mx-auto"></div></td>
                      <td className="px-6 py-7"><div className="h-6 bg-gray-100 rounded-full w-24 mx-auto"></div></td>
                      <td className="px-8 py-7"><div className="h-8 bg-gray-100 rounded-xl w-24 mx-auto"></div></td>
                    </tr>
                  ))
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200">
                          <Users size={48} />
                        </div>
                        <p className="text-gray-400 font-bold font-tiro text-lg">কোনো সদস্য পাওয়া যায়নি।</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="table-row group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-110 transition-transform">
                            {member.name[0]}
                          </div>
                          <div>
                            <p className="text-[16px] font-bold text-gray-900">{member.name}</p>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5">
                              <Award size={12} /> {member.role || 'সদস্য'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[13px] font-bold text-gray-700">
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
                        <span className={`badge-${member.status?.toLowerCase() === 'active' ? 'emerald' : 'rose'} px-4 py-1.5`}>
                          {member.status?.toLowerCase() === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center">
                        {member.user_id ? (
                          <div className="inline-flex items-center gap-2 text-emerald-600 font-bold text-[11px] uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                            <ShieldCheck size={14} /> লিঙ্কড
                          </div>
                        ) : (
                          <button className="inline-flex items-center gap-2 text-amber-600 font-bold text-[11px] uppercase tracking-wider bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors">
                            <LinkIcon size={14} /> লিঙ্ক করুন
                          </button>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all">
                            <Edit size={20} />
                          </button>
                          <button className="p-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all">
                            <Trash2 size={20} />
                          </button>
                          <div className="w-[1px] h-6 bg-gray-100 mx-1"></div>
                          <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all">
                            <ChevronRight size={20} />
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
