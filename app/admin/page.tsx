"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
omponents/layout";/d
import { useAuth } from "@/components/providers";

export default function AdminRoot() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (role === "admin") {
        router.push("/admin/users");
      } else {
        router.push("/dashboard");
      }
    }
  }, [role, loading, router]);

  return (
    
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-[14px] font-bold text-emerald-900/40 tracking-widest uppercase">অ্যাডমিন প্যানেল লোড হচ্ছে...</p>
        </div>
      </div>
    
  );
}
