"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { 
  User, Phone, MapPin, Shield, 
  ArrowLeft, Download, Calendar, 
  Activity, Wallet, Heart
} from "lucide-react";

export default function AdminMemberDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: m } = await supabase().from("members").select("*").eq("id", id).single();
        const { data: d } = await supabase().from("donations").select("*").eq("member_id", id).order("date", { ascending: false });
        setMember(m);
        setDonations(d || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!member) return <div className="p-20 text-center">সদস্য পাওয়া যায়নি</div>;

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold">
        <ArrowLeft size={18} /> ফিরে যান
      </button>

      <div className="card-premium p-8 bg-[#064E3B] text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center text-4xl font-bold">
            {member.name[0]}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold font-tiro mb-2">{member.name}</h1>
            <p className="text-white/70">{member.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
