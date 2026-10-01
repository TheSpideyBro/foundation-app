import Link from "next/link";
import { Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFDFC] flex flex-col items-center justify-center px-6 text-center font-akkas">
      <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 mb-8">
        <Leaf size={28} fill="currentColor" />
      </div>
      <p className="text-6xl font-bold text-emerald-600 font-shadhinata mb-4">৪০৪</p>
      <h1 className="text-2xl font-bold text-gray-900 font-shadhinata mb-3">
        পৃষ্ঠা পাওয়া যায়নি
      </h1>
      <p className="text-gray-500 mb-8 max-w-sm leading-relaxed">
        দুঃখিত, আপনি যে পৃষ্ঠাটি খুঁজছেন তা নেই বা সরিয়ে ফেলা হয়েছে।
      </p>
      <Link href="/" className="btn-emerald">
        হোমপেজে ফিরে যান
      </Link>
    </div>
  );
}
