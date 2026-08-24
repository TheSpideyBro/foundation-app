"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { 
  Phone, Lock, ArrowRight, Heart, 
  ShieldCheck, Loader2, MessageCircle
} from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert phone to virtual email
      const virtualEmail = phone.includes("@") ? phone : `${phone}@foundation.app`;
      
      const { error } = await supabase().auth.signInWithPassword({
        email: virtualEmail,
        password,
      });

      if (error) throw error;
      router.push("/dashboard");
    } catch (err: any) {
      setError("ফোন নম্বর বা পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-50 rounded-full -mr-64 -mt-64 blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-100/30 rounded-full -ml-64 -mb-64 blur-3xl opacity-50"></div>

      <div className="w-full max-w-[480px] p-8 relative z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-600/30 animate-bounce-slow">
            <Heart className="text-white fill-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 font-tiro mb-3">দাউলখার ফাউন্ডেশন</h1>
          <p className="text-gray-500 font-medium">আপনার একাউন্টে লগইন করুন</p>
        </div>

        <div className="card-premium p-10 bg-white/80 backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">মোবাইল নম্বর</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="017XXXXXXXX"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-gray-900"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">পাসওয়ার্ড</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-gray-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
                <XCircle size={18} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-emerald py-4 text-lg shadow-xl shadow-emerald-600/30"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  লগইন করুন <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-50 text-center space-y-4">
            <p className="text-gray-500 text-sm font-medium">
              একাউন্ট নেই? <Link href="/signup" className="text-emerald-600 font-bold hover:underline">নতুন একাউন্ট খুলুন</Link>
            </p>
            <div className="flex items-center justify-center gap-6 text-gray-400">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest">
                <ShieldCheck size={14} className="text-emerald-500" />
                নিরাপদ
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest">
                <MessageCircle size={14} className="text-emerald-500" />
                সহায়তা
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

function XCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
