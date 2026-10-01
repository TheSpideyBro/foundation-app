"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for debugging (server logs pick this up in production)
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FDFDFC] flex flex-col items-center justify-center px-6 text-center font-hind">
      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-8">
        <TriangleAlert size={28} />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 font-tiro mb-3">
        কিছু ভুল হয়েছে
      </h1>
      <p className="text-gray-500 mb-8 max-w-sm leading-relaxed">
        দুঃখিত, এই পৃষ্ঠাটি লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা
        করুন।
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => reset()} className="btn-emerald">
          আবার চেষ্টা করুন
        </button>
        <Link href="/" className="btn-outline">
          হোমপেজে ফিরে যান
        </Link>
      </div>
    </div>
  );
}
