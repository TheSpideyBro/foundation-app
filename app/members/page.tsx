"use client";

import { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, Filter, 
  Phone, MapPin, ChevronRight, MoreHorizontal,
  Shield, CheckCircle, XCircle, Mail
} from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import Link from "next/link";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data } = await supabase().from("members").select("*").order("name");
        setMembers(data || []);
      } catch (err) {
        console.error("Error fetching members:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold font-tiro text-gray-900">সদস্য তালিকা</h1>
          <p className="text-gray-500 text-[14px]">ফাউন্ডেশনের সকল নিবন্ধিত সদস্য</p>
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="সদস্য খুঁজুন..." className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-[14px] outline-none focus:bg-white transition-all" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:gap-px bg-gray-50">
          {members.map((member) => (
            <div key={member.id} className="bg-white p-6 hover:bg-emerald-50/30 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-100">
                  {member.name[0]}
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${member.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                  {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </div>
              </div>
              <h3 className="text-[17px] font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">{member.name}</h3>
              <p className="text-xs text-gray-400 font-medium mb-4">{member.role || 'সদস্য'}</p>
              
              <div className="space-y-2.5 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone size={14} className="text-emerald-600" /> {member.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={14} className="text-emerald-600" /> {member.address || 'ঠিকানা নেই'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
