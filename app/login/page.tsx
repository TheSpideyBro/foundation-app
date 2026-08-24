"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stamp, Eye, EyeOff, Phone } from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";

const C = {
  ink: "#1B4332", paper: "#FBF8F1", page: "#EDEAE0", border: "#E4DCC8",
  gold: "#C9972D", red: "#A63D40", text: "#2B2B26", sub: "#8A8371", label: "#7A7364",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatVirtualEmail = (p: string) => {
    // Remove non-digits
    const cleanPhone = p.replace(/\D/g, "");
    return `${cleanPhone}@foundation.app`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (phone.length < 10) {
      setError("সঠিক ফোন নম্বর লিখুন (কমপক্ষে ১০ সংখ্যা)");
      setLoading(false);
      return;
    }

    const virtualEmail = formatVirtualEmail(phone);

    try {
      if (mode === "login") {
        const { error } = await supabase().auth.signInWithPassword({ 
          email: virtualEmail, 
          password 
        });
        if (error) {
          const errMsg = error.message.includes("Invalid login credentials")
            ? "ফোন নম্বর অথবা পাসওয়ার্ড ভুল আছে"
            : "লগইন হয়নি: " + error.message;
          setError(errMsg);
          setLoading(false);
          return;
        }
      } else {
        const { data: { user: authUser }, error: authError } = await supabase().auth.signUp({
          email: virtualEmail, 
          password, 
          options: { data: { name, phone } }
        });
        
        if (authError) {
          const sigupMsg = authError.message.includes("already registered")
            ? "এই নম্বর দিয়ে ইতিমধ্যে একাউন্ট আছে — লগইন করুন"
            : "নতুন একাউন্ট খোলা যাচ্ছে না: " + authError.message;
          setError(sigupMsg);
          setLoading(false);
          return;
        }

        if (authUser) {
          // Attempt to link member automatically
          const { data: memberData } = await supabase()
            .from("members")
            .select("id")
            .eq("phone", phone)
            .single();

          const { error: profileError } = await supabase()
            .from("users")
            .insert({ 
              id: authUser.id, 
              email: virtualEmail, 
              role: "member",
              is_approved: false // Require admin approval for new signups
            });

          if (memberData) {
            await supabase()
              .from("members")
              .update({ user_id: authUser.id })
              .eq("id", memberData.id);
          }
        }
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "কিছু সমস্যা হয়েছে");
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
          <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Tiro Bangla', serif", color: "#F3EFE2" }}>দৌলখাঁড় ফাউন্ডেশন</h1>
          <p className="text-[11px]" style={{ color: "#B8CCC0" }}>হিসাব খাতা</p>
        </div>

        <div className="flex border-b px-8" style={{ borderColor: C.border }}>
          <button onClick={() => { setMode("login"); setError(""); }} className="flex-1 py-3 text-[13px] font-medium transition" style={{ color: mode === "login" ? C.ink : C.sub, borderBottom: mode === "login" ? `2px solid ${C.gold}` : "transparent" }}>লগইন</button>
          <button onClick={() => { setMode("signup"); setError(""); }} className="flex-1 py-3 text-[13px] font-medium transition" style={{ color: mode === "signup" ? C.ink : C.sub, borderBottom: mode === "signup" ? `2px solid ${C.gold}` : "transparent" }}>নতুন একাউন্ট</button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          {error && (
            <div role="alert" className="text-[12.5px] px-3 py-2 rounded-sm border" style={{ background: C.red + "14", color: C.red, borderColor: C.red + "40" }}>
              {error}
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>আপনার নাম</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-sm px-3 py-2.5 text-[13px] outline-none border focus:ring-1 transition" style={{ background: "#fff", borderColor: C.border }} />
            </div>
          )}

          <div>
            <label htmlFor="phone" className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>ফোন নম্বর</label>
            <div className="relative">
              <input id="phone" type="tel" placeholder="017XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full rounded-sm px-3 py-2.5 pl-10 text-[13px] outline-none border focus:ring-1 transition" style={{ background: "#fff", borderColor: C.border }} />
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-[12px] font-medium block mb-1.5" style={{ color: C.label }}>পাসওয়ার্ড</label>
            <div className="relative">
              <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full rounded-sm px-3 py-2.5 pr-10 text-[13px] outline-none border focus:ring-1 transition" style={{ background: "#fff", borderColor: C.border }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.sub }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-sm text-[13.5px] font-semibold transition hover:brightness-105 disabled:opacity-60" style={{ background: C.gold, color: C.ink }}>
            {loading ? "প্রক্রিয়া চলছে..." : mode === "login" ? "লগইন করুন" : "নতুন একাউন্ট খুলুন"}
          </button>
        </form>

        <div className="pb-6 px-8 text-center">
          <p className="text-[10.5px]" style={{ color: C.sub }}>
            {mode === "login" ? "একাউন্ট নেই? " : "ইতিমধ্যে একাউন্ট আছে? "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="underline underline-offset-2 font-medium" style={{ color: C.ink }}>
              {mode === "login" ? "নতুন একাউন্ট খুলুন" : "লগইন করুন"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
