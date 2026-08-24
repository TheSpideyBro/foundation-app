"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";

export default function AdminRoot() {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role === "admin") {
      router.replace("/admin/users");
    } else {
      router.replace("/dashboard");
    }
  }, [role, router]);

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );
}
