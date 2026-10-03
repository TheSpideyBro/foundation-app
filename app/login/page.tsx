"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase as supabase } from "@/lib/supabase-client";
import {
  Phone, Lock, ArrowRight, Heart,
  ShieldCheck, Loader2, MessageCircle,
  Eye, EyeOff
} from "lucide-react";
import Link from "next/link";
import DeveloperCredit from "@/components/DeveloperCredit";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // H5: honor the callbackUrl middleware sets for unauthenticated users.
  // Only same-origin paths are allowed: must start with "/" but not "//".
  const rawCallback = searchParams.get("callbackUrl");
  const callbackUrl =
    rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : null;

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
      router.push(callbackUrl ?? "/dashboard");
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (msg.includes("Invalid login credentials")) {
        setError("ফোন নম্বর বা পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।");
      } else if (msg.includes("Email not confirmed")) {
        setError("অ্যাকাউন্ট নিশ্চিত করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।");
      } else if (msg.includes("For security purposes") || msg.toLowerCase().includes("rate limit")) {
        setError("অনেকবার ভুল চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।");
      } else if (msg) {
        setError("লগইন করতে সমস্যা হয়েছে: " + msg);
      } else {
        setError("লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC] relative overflow-hidden p-4 sm:p-6">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-50 rounded-full -mr-32 sm:-mr-64 -mt-32 sm:-mt-64 blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-100/30 rounded-full -ml-32 sm:-ml-64 -mb-32 sm:-mb-64 blur-3xl opacity-50"></div>

      <div className="w-full max-w-[480px] relative z-10" style={{ opacity: 1 }}>
        <div className="text-center mb-8 sm:mb-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl shadow-emerald-600/30 animate-bounce-slow" style={{ background: '#059669', boxShadow: '0 25px 50px -12px rgba(5, 150, 105, 0.25)' }}>
            <Heart className="text-white fill-white w-7 h-7 sm:w-8 sm:h-8" style={{ width: '32px', height: '32px' }} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 font-shadhinata mb-2 sm:mb-3" style={{ fontFamily: 'var(--font-shadhinata), sans-serif' }}>দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন</h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium">আপনার একাউন্টে লগইন করুন</p>
        </div>

        <div className="p-6 sm:p-10 bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-gray-100" style={{ background: 'white', borderRadius: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
          <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
            <div>
              <label className="block text-[13px] font-bold text-gray-500 mb-2 ml-1">মোবাইল নম্বর</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-700 transition-colors" size={20} />
                <input
                  type="text"
                  inputMode="tel"
                  placeholder="017XXXXXXXX"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-gray-900"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-gray-500 mb-2 ml-1">পাসওয়ার্ড</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-700 transition-colors" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-gray-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
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
              একাউন্ট নেই? <Link href="/signup" className="text-emerald-700 font-bold hover:underline">নতুন একাউন্ট খুলুন</Link>
            </p>
            <div className="flex items-center justify-center gap-6 text-gray-500">
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <ShieldCheck size={14} className="text-emerald-500" />
                নিরাপদ
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <MessageCircle size={14} className="text-emerald-500" />
                সহায়তা
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom credit — always visible */}
      <div className="fixed bottom-0 left-0 right-0 pb-4 pt-8 bg-gradient-to-t from-[#FDFDFC] via-[#FDFDFC]/90 to-transparent pointer-events-none">
        <DeveloperCredit variant="dark" />
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
