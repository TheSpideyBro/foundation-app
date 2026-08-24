"use client";

import { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, Filter, 
  MoreVertical, Edit, Trash2, Link as LinkIcon, 
  Unlink, CheckCircle, XCircle, ChevronRight,
  Download, Mail, Phone, MapPin, ExternalLink
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import AppLayout from "@/components/layout";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: membersData } = await supabase()
        .from("members")
        .select("*, users(email, phone)")
        .order("name");
      
      const { data: usersData } = await supabase()
        .from("users")
        .select("id, email, phone")
        .order("email");

      setMembers(membersData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.phone?.includes(searchTerm);
    const matchesStatus = filterStatus === "all" || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-tiro">সদস্য তালিকা</h1>
          <p className="text-gray-500 font-medium mt-1">ফাউন্ডেশনের সকল নিবন্ধিত সদস্যদের ব্যবস্থাপনা করুন।</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline">
            <Download size={18} /> এক্সপোর্ট
          </button>
          <button className="btn-emerald">
            <UserPlus size={18} /> নতুন সদস্য
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium p-6 flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Users size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">মোট সদস্য</p>
            <p className="text-2xl font-bold text-gray-900">{members.length}</p>
          </div>
        </div>
        <div className="card-premium p-6 flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <CheckCircle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">সক্রিয় সদস্য</p>
            <p className="text-2xl font-bold text-gray-900">{members.filter(m => m.status === 'Active').length}</p>
          </div>
        </div>
        <div className="card-premium p-6 flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <LinkIcon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">লিঙ্কড ইউজার</p>
            <p className="text-2xl font-bold text-gray-900">{members.filter(m => m.user_id).length}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card-premium p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="সদস্যের নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 transition-all font-bold text-gray-600 appearance-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">সব স্ট্যাটাস</option>
              <option value="Active">সক্রিয়</option>
              <option value="Inactive">নিষ্ক্রিয়</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="table-container animate-slide-up">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="table-header">
              <th className="px-8 py-5 w-12">
                <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              </th>
              <th className="px-6 py-5">সদস্যের নাম</th>
              <th className="px-6 py-5">যোগাযোগ</th>
              <th className="px-6 py-5">স্ট্যাটাস</th>
              <th className="px-6 py-5">ইউজার অ্যাকাউন্ট</th>
              <th className="px-6 py-5 text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr key={member.id} className="table-row group">
                <td className="px-8 py-5">
                  <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                      {member.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-[15px]">{member.name}</p>
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{member.role || 'Member'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-gray-600">
                      <Phone size={14} className="text-gray-400" />
                      {member.phone}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                      <MapPin size={12} className="text-gray-300" />
                      {member.address || 'ঠিকানা নেই'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`badge-${member.status === 'Active' ? 'emerald' : 'rose'}`}>
                    {member.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </td>
                <td className="px-6 py-5">
                  {member.user_id ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-[13px]">
                      <CheckCircle size={16} />
                      লিঙ্কড
                    </div>
                  ) : (
                    <button className="text-amber-600 font-bold text-[13px] flex items-center gap-2 hover:underline">
                      <LinkIcon size={16} />
                      লিঙ্ক করুন
                    </button>
                  )}
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                      <Edit size={18} />
                    </button>
                    <button className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                    <button className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredMembers.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={40} className="text-gray-200" />
            </div>
            <p className="text-gray-400 font-medium">কোনো সদস্য পাওয়া যায়নি</p>
          </div>
        )}
      </div>
    </div>
  );
}
