"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { UserPlus, Phone, Key, ShieldCheck, Heart, ArrowRight, LogIn, User, Loader2, Eye, EyeOff, CircleX, CircleCheck } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccess(null);

    // M14: validate Bangladeshi mobile number before hitting the API.
    const trimmedPhone = phone.trim();
    if (!/^01[3-9]\d{8}$/.test(trimmedPhone)) {
      setError("সঠিক মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।");
      return;
    }
    if (password.length < 6) {
      setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }
    if (password !== confirmPassword) {
      setError("পাসওয়ার্ড দুটি মেলেনি!");
      return;
    }
    setLoading(true);
    
    const virtualEmail = `${trimmedPhone}@foundation.app`;
    
    const { error: signUpError } = await supabase().auth.signUp({
      email: virtualEmail,
      password,
      options: {
        // Only non-privileged profile fields. role / is_approved used to be
        // sent here and were copied straight into public.users — anyone could
        // register as an approved admin (BUG-012). The DB trigger and
        // AuthProvider now hard-code them regardless.
        data: {
          name: name,
          phone: trimmedPhone
        }
      }
    });

    if (signUpError) {
      const msg: string = signUpError.message || "";
      if (msg.includes("User already registered")) {
        setError("এই নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে।");
      } else if (msg.toLowerCase().includes("password")) {
        setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      } else {
        // Never surface raw English error.message to the user.
        setError("রেজিস্ট্রেশন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
      setLoading(false);
    } else {
      setSuccess("অ্যাকাউন্ট তৈরি সফল হয়েছে! অ্যাডমিন অ্যাপ্রুভ করলে আপনি লগইন করতে পারবেন।");
      // Keep loading=true so the button stays disabled until the redirect.
      redirectTimer.current = setTimeout(() => router.push("/login"), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-100/30 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 opacity-50"></div>
      <div className="absolute bottom-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-50/30 rounded-full blur-3xl translate-y-1/2 translate-x-1/2 opacity-50"></div>

      <div className="w-full max-w-[1000px] bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-emerald-900/10 overflow-hidden flex flex-col md:flex-row-reverse relative z-10 border border-emerald-50">
        {/* Left Side: Branding */}
        <div className="md:w-[40%] bg-[#064E3B] p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
             <div className="absolute -top-20 -left-20 w-64 h-64 border-[40px] border-emerald-400 rounded-full"></div>
             <div className="absolute top-1/2 -right-20 w-40 h-40 border-[20px] border-emerald-500 rounded-full"></div>
          </div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
              <UserPlus size={32} className="text-white" />
            </div>
            <h1 className="text-[36px] font-bold font-shadhinata leading-tight mb-4">আমাদের সাথে যুক্ত হোন</h1>
            <p className="text-emerald-400/80 text-[16px] font-medium leading-relaxed max-w-xs">
              দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশনের সদস্য হিসেবে স্বচ্ছ ও জবাবদিহিমূলক সেবায় অংশগ্রহণ করুন।
            </p>
          </div>

          <div className="relative z-10 pt-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <ShieldCheck size={20} className="text-emerald-400" />
              </div>
              <p className="text-[14px] font-medium text-emerald-100/70">সহজ রেজিস্ট্রেশন পদ্ধতি</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Heart size={20} className="text-emerald-400" />
              </div>
              <p className="text-[14px] font-medium text-emerald-100/70">ফাউন্ডেশনের সকল সুবিধা পান</p>
            </div>
          </div>
        </div>

        {/* Right Side: Signup Form */}
        <div className="md:w-[60%] p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-white/50 backdrop-blur-sm">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 font-shadhinata mb-2">নতুন একাউন্ট</h2>
            <p className="text-gray-500 text-sm font-medium">আপনার তথ্য দিয়ে রেজিস্ট্রেশন সম্পন্ন করুন</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 ml-1">পূর্ণ নাম (বাংলায়)</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[15px] outline-none focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-gray-900"
	                  placeholder="আপনার পূর্ণ নাম বাংলায় লিখুন"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 ml-1">মোবাইল নম্বর</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                <input 
                  type="text" 
                  required 
                  inputMode="tel"
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[15px] outline-none focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-gray-900"
                  placeholder="017XXXXXXXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 ml-1">পাসওয়ার্ড</label>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[15px] outline-none focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-gray-900"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 font-medium ml-1">কমপক্ষে ৬ অক্ষর</p>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 ml-1">নিশ্চিত করুন</label>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[15px] outline-none focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-gray-900"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                    aria-pressed={showConfirmPassword}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
                <CircleX size={18} className="shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-bold">
                <CircleCheck size={18} className="shrink-0" />
                {success}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-emerald py-4 text-lg shadow-xl shadow-emerald-900/20"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  একাউন্ট তৈরি করুন <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-[14px]">
              ইতিমধ্যেই একাউন্ট আছে? {" "}
              <Link href="/login" className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1">
                লগইন করুন <LogIn size={14} />
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
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
