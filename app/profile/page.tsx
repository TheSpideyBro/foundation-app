"use client";

import { useState, useEffect } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";
import { 
  User, Phone, MapPin, Award, 
  Calendar, Download, ShieldCheck, 
  Key, X, Heart, Activity
} from "lucide-react";

export default function ProfilePage() {
  const { user, memberId, role, phone } = useAuth();
  const [member, setMember] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!memberId) {
        setLoading(false);
        return;
      }
      try {
        const { data: m } = await supabase().from("members").select("*").eq("id", memberId).single();
        const { data: d } = await supabase().from("donations").select("*").eq("member_id", memberId).order("date", { ascending: false });
        setMember(m);
        setDonations(d || []);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [memberId]);

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!member) return (
    <div className="max-w-md mx-auto mt-20 text-center px-4">
      <div className="card-premium p-12">
        <User size={48} className="mx-auto mb-6 text-gray-200" />
        <h2 className="text-xl font-bold font-tiro text-gray-900 mb-3">সদস্য তথ্য পাওয়া যায়নি</h2>
        <p className="text-sm text-gray-500 mb-6">আপনার অ্যাকাউন্টের সাথে কোনো মেম্বার প্রোফাইল লিঙ্ক করা নেই।</p>
        <div className="p-4 bg-emerald-50 rounded-2xl">
          <p className="text-xs text-emerald-600 font-bold uppercase mb-1">আপনার আইডি</p>
          <p className="text-sm font-bold text-gray-700">{phone || user?.email}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="card-premium p-8 bg-[#064E3B] text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-4xl font-bold">
            {member.name[0]}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold font-tiro mb-2">{member.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-white/70 text-sm">
              <span className="flex items-center gap-1.5"><Phone size={14} /> {member.phone}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} /> {member.address || 'ঠিকানা নেই'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="card-premium p-6">
            <h3 className="font-bold font-tiro mb-4 flex items-center gap-2">
              <Activity size={18} className="text-emerald-600" /> অবদান
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl">
                <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">মোট অনুদান</p>
                <p className="text-2xl font-bold text-emerald-700 font-tiro">৳{donations.reduce((sum, d) => sum + Number(d.amount), 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <div className="card-premium overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-bold font-tiro">দানের ইতিহাস</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {donations.map((d, i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all">
                  <div>
                    <p className="font-bold text-gray-900">{new Date(d.date).toLocaleDateString('bn-BD')}</p>
                    <p className="text-xs text-gray-400">{d.donation_month || 'সাধারণ'}</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-600 font-tiro">৳{Number(d.amount).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-gray-100 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
          <ShieldCheck size={14} className="text-emerald-600" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Developed by Saddam Hossain Akash
          </p>
        </div>
      </div>
    </div>
  );
}
