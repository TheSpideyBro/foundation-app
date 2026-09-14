"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers";
import AppLayout from "@/components/layout";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/";
  const { user, isApproved, loading, signOut } = useAuth();

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Enforce account approval for authenticated non-auth pages
  if (user && !isApproved) {
    return (
      <div className="min-h-screen bg-[#FDFDFC] flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ⏳
          </div>
          <h1 className="text-xl font-bold font-tiro text-gray-900">
            অ্যাকাউন্ট অনুমোদনের অপেক্ষায়
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            আপনার অ্যাকাউন্টটি তৈরি হয়েছে, কিন্তু এখনো অ্যাডমিন কর্তৃক অনুমোদিত হয়নি।
            অ্যাডমিন অনুমোদন দিলে আপনি সমস্ত ফিচার ব্যবহার করতে পারবেন।
          </p>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
            className="btn-outline w-full mt-4"
          >
            লগআউট করুন
          </button>
        </div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
