"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stamp, Eye, EyeOff } from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase().auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
        });
        if (error) {
          setError("রিসেট লিংক পাঠানো যায়নি: " + error.message);
          setLoading(false);
          return;
        }
        setResetSent(true);
        setLoading(false);
        return;
      }
      if (mode === "login") {
        const { error } = await supabase().auth.signInWithPassword({ email, password });
        if (error) {
          // Provide user-friendly messages for common auth errors
          const emailErrMsg = error.message.includes("Invalid login credentials")
            ? "ইমেল অথবা পাসওয়ার্ড ভুল আছে — আবার চেষ্টা করুন বা পাসওয়ার্ড রিসেট করুন"
            : error.message.includes("Invalid email")
            ? "বৈধ ইমেল ঠিকানা লিখুন"
            : error.message.includes("Not enough password length")
            ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"
            : error.message.includes("Email not confirmed")
            ? "ইমেল ভেরিফিকেশন প্রয়োজন — অনুগ্রহ করে ইমেল চেক করুন"
            : error.message.includes("Too many requests")
            ? "অনেকবার চেষ্টা করেছেন — কিছুক্ষণ পর আবার চেষ্টা করুন"
            : "লগইন হয়নি: " + error.message;
          setError(emailErrMsg);
          setLoading(false);
          return;
        }
      } else {
        const { data: { user: authUser }, error: authError } = await supabase().auth.signUp({
          email, password, options: { data: { name } }
        });
        if (authError) {
          const sigupMsg = authError.message.includes("already registered") || authError.message.includes("User already registered")
            ? "এই ইমেইল দিয়ে ইতিমধ্যে একাউন্ট আছে — লগইন করুন"
            : authError.message.includes("Invalid email")
            ? "বৈধ ইমেইল ঠিকানা লিখুন"
            : authError.message.includes("Weak password")
            ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"
            : "নতুন একাউন্ট খোলা যাচ্ছে না: " + authError.message;
          setError(sigupMsg);
          setLoading(false);
          return;
        }
        if (authUser) {
          const { error: profileError } = await supabase()
            .from("users")
            .insert({ id: authUser.id, email, role: "member" });
          if (profileError) {
            // Profile insert may fail if RLS blocks it — still allow login
            console.warn("Profile insert failed:", profileError.message);
          }
        }
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "কিছু সমস্যা হয়েছে";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.page }}>
      <div className="w-full max-w-md rounded-sm shadow-lg overflow-hidden" style={{ background: C.paper, borderColor: C.border }}>
        <div className="px-8 pt-8 pb-6 text-center" style={{ background: C.ink }}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.gold }}>
              <Stamp size={18} style={{ color: C.ink }} strokeWidth={2} />
            </div>
          </div>
          <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: "#F3EFE2" }}>দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন</h1>
          <p className="text-[11px]" style={{ color: "#B8CCC0" }}>হিসাব খাতা</p>
        </div>

        <div className="flex border-b px-8" style={{ borderColor: C.border }}>
          <button onClick={() => { setMode("login"); setError(""); }} className="flex-1 py-3 text-[13px] font-medium relative transition" style={{ color: mode === "login" ? C.ink : C.sub, borderBottom: mode === "login" ? `2px solid ${C.gold}` : "transparent" }}>লগইন</button>
          <button onClick={() => { setMode("signup"); setError(""); }} className="flex-1 py-3 text-[13px] font-medium relative transition" style={{ color: mode === "signup" ? C.ink : C.sub, borderBottom: mode === "signup" ? `2px solid ${C.gold}` : "transparent" }}>নতুন একাউন্ট</button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          {mode === "reset" && (
            <div role="status" className="text-[12.5px] px-3 py-2 rounded-sm border" style={{ background: resetSent ? C.ink + "14" : C.ink + "14", color: C.ink, borderColor: C.ink + "40" }}>
              {resetSent
                ? `${email ? email + "-তে" : "আপনার ইমেলে"} পাসওয়ার্ড রিসেটের লিংক পাঠানো হয়েছে। ইমেল চেক করুন (স্প্যাম ফোল্ডারেও দেখুন) এবং লিংকে ক্লিক করে নতুন পাসওয়ার্ড সেট করুন।`
                : "আপনার অ্যাকাউন্টের ইমেল দিন — রিসেট লিংক সেখানে পাঠানো হবে।"}
            </div>
          )}

          {error && (
            <div role="alert" className="text-[12.5px] px-3 py-2 rounded-sm border" style={{ background: C.red + "14", color: C.red, borderColor: C.red + "40" }}>
              {error}
            </div>
          )}

          {mode !== "reset" && mode === "signup" && (
            <div>
              <label htmlFor="name" className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>নাম</label>
              <input id="name" name="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2 transition" style={{ background: "#fff", borderColor: C.border, boxShadow: `0 0 0 2px ${C.gold}` }} />
            </div>
          )}

          <div>
            <label htmlFor="email" className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>ইমেইল</label>
            <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none focus:ring-2 transition" style={{ background: "#fff", borderColor: C.border }} />
          </div>

          {mode !== "reset" && (
          <div>
            <label htmlFor="password" className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>পাসওয়ার্ড</label>
            <div className="relative">
              <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full rounded-sm px-3 py-2.5 pr-10 text-[13px] outline-none focus:ring-2 transition" style={{ background: "#fff", borderColor: C.border }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.sub }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          )}

          {mode === "login" && (
            <div className="text-right">
              <button type="button" onClick={() => { setMode("reset"); setError(""); setResetSent(false); }} className="text-[12px] underline underline-offset-2" style={{ color: C.ink }}>
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-sm text-[13.5px] font-semibold transition hover:brightness-105 disabled:opacity-60" style={{ background: C.gold, color: C.ink }}>
            {loading ? "প্রক্রিয়া চলছে..." : mode === "login" ? "লগইন করুন" : mode === "reset" ? "রিসেট লিংক পাঠান" : "নতুন একাউন্ট খুলুন"}
          </button>

          {mode === "reset" && (
            <button type="button" onClick={() => { setMode("login"); setError(""); setResetSent(false); }} className="w-full text-[12px] text-center py-1.5" style={{ color: C.sub }}>
              ← লগইন পেজে ফিরুন
            </button>
          )}
        </form>

        {mode !== "reset" && (
        <div className="pb-6 px-8 text-center">
          <p className="text-[10.5px]" style={{ color: C.sub }}>
            {mode === "login" ? "একাউন্ট নেই? " : "ইতিমধ্যে একাউন্ট আছে? "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="underline underline-offset-2 font-medium" style={{ color: C.ink }}>
              {mode === "login" ? "নতুন একাউন্ট খুলুন" : "লগইন করুন"}
            </button>
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
