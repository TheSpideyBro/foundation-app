import Link from "next/link";
import { 
  Heart, ChevronRight, ArrowRight, 
  Phone, Globe, Zap
} from "lucide-react";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFC] selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:rotate-12 transition-transform duration-500">
              <Heart className="text-white" size={20} fill="currentColor" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900 font-tiro block leading-tight">দৌলখাঁড় হিলফুল ফুযুল ফাউন্ডেশন</span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">সেবাই আমাদের ধর্ম</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/login" className="text-sm font-bold text-gray-900 hover:text-emerald-600 transition-colors">লগইন</Link>
            <Link href="/signup" className="btn-emerald py-2.5 px-6 text-sm shadow-none">
              সদস্য হন <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-50/50 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-50/50 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full text-emerald-700 text-xs font-bold uppercase tracking-widest mb-8 animate-slide-up">
            <Zap size={14} fill="currentColor" /> নতুন যুগের ফাউন্ডেশন ম্যানেজমেন্ট
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 font-tiro leading-[1.1] mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            মানবতার কল্যাণে, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-800">একতাবদ্ধ মোরা সকলে</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-500 font-medium leading-relaxed mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            দৌলখাঁড় হিলফুল ফুযুল ফাউন্ডেশনের সকল আর্থিক হিসাব, সদস্য ব্যবস্থাপনা এবং অনুদান ট্র্যাকিং এখন আরও সহজ ও স্বচ্ছ।
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Link href="/signup" className="btn-emerald w-full sm:w-auto px-10 py-5 text-lg shadow-2xl shadow-emerald-600/30">
              আজই যোগ দিন <ChevronRight size={20} />
            </Link>
            <Link href="/login" className="btn-outline w-full sm:w-auto px-10 py-5 text-lg">
              হিসাব দেখুন
            </Link>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-emerald-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-emerald-900/40">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white font-tiro mb-8">আজই আমাদের ফাউন্ডেশনের অংশ হোন</h2>
              <p className="text-emerald-100/70 text-lg mb-12 max-w-xl mx-auto">একত্রে আমরা গড়বো এক সুন্দর আগামী। আপনার সামান্য অবদান হতে পারে কারো জীবনের বড় পরিবর্তন।</p>
              <Link href="/signup" className="bg-white text-emerald-900 px-12 py-5 rounded-2xl font-bold text-lg hover:bg-emerald-50 transition-all shadow-xl inline-flex items-center gap-3 active:scale-95">
                নিবন্ধন করুন <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Heart className="text-white" size={16} fill="currentColor" />
            </div>
            <span className="text-sm font-bold text-gray-900 font-tiro">দৌলখাঁড় হিলফুল ফুযুল ফাউন্ডেশন</span>
          </div>
          <div>
            <p className="text-sm text-gray-400 font-medium">© ২০২৬ দৌলখাঁড় হিলফুল ফুযুল ফাউন্ডেশন। সর্বস্বত্ব সংরক্ষিত।</p>
            <p className="text-[10px] text-gray-300 font-medium mt-1">Developed by Saddam Hossain Akash</p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-gray-400 hover:text-emerald-600 transition-colors"><Phone size={20} /></Link>
            <Link href="#" className="text-gray-400 hover:text-emerald-600 transition-colors"><Globe size={20} /></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
