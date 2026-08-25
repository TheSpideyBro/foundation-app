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
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    phone: ""
  });

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
        if (m) {
          setEditForm({
            name: m.name,
            address: m.address || "",
            phone: m.phone || ""
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [memberId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Update member record
      const { error: memberError } = await supabase()
        .from("members")
        .update({
          name: editForm.name,
          address: editForm.address,
          phone: editForm.phone
        })
        .eq("id", memberId);

      if (memberError) throw memberError;

      // Also update user record if it exists
      const { error: userError } = await supabase()
        .from("users")
        .update({
          name: editForm.name,
          phone: editForm.phone
        })
        .eq("id", user?.id);

      if (userError) throw userError;

      alert("প্রোফাইল সফলভাবে আপডেট করা হয়েছে!");
      setMember({ ...member, ...editForm });
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("আপডেট করতে সমস্যা হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
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
          <button 
            onClick={() => setIsEditing(true)}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl text-sm font-bold transition-all"
          >
            এডিট প্রোফাইল
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsEditing(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-emerald-600 text-white">
              <div>
                <h2 className="text-xl font-bold font-tiro">প্রোফাইল এডিট করুন</h2>
                <p className="text-emerald-100 text-xs mt-1">আপনার ব্যক্তিগত তথ্য আপডেট করুন</p>
              </div>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6 sm:p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">পূর্ণ নাম (বাংলায়) *</label>
                <input 
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">ফোন নম্বর</label>
                <input 
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">ঠিকানা</label>
                <input 
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-[10px] text-amber-600 font-bold uppercase mb-1">সতর্কতা</p>
                <p className="text-[12px] text-amber-700 leading-relaxed">
                  আপনার মাসিক অঙ্গীকার বা রোল পরিবর্তন করতে চাইলে দয়া করে অ্যাডমিনের সাথে যোগাযোগ করুন।
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? 'সেভ হচ্ছে...' : 'আপডেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
