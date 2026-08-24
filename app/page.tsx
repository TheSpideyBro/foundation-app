"use client";

import Link from "next/link";
import { 
  Heart, ArrowRight, ShieldCheck, Users, 
  TrendingUp, Globe, CheckCircle2, Star
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFC] overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Heart className="text-white fill-white" size={20} />
            </div>
            <span className="text-2xl font-bold text-gray-900 font-tiro tracking-tight">দাউলখার ফাউন্ডেশন</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-bold text-gray-500 uppercase tracking-widest">
            <a href="#features" className="hover:text-emerald-600 transition-colors">বৈশিষ্ট্য</a>
            <a href="#about" className="hover:text-emerald-600 transition-colors">আমাদের সম্পর্কে</a>
            <Link href="/login" className="text-emerald-600 border-2 border-emerald-600/20 px-6 py-2.5 rounded-xl hover:bg-emerald-50 transition-all">লগইন</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-50 rounded-full -mr-96 -mt-96 blur-3xl opacity-50"></div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-[13px] font-bold uppercase tracking-widest mb-6 border border-emerald-100">
              <Star size={14} className="fill-emerald-700" /> মানবতার সেবায় নিয়োজিত
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-gray-900 font-tiro leading-[1.1] mb-8">
              একসাথে গড়ি <br />
              <span className="text-emerald-600 relative">
                সুন্দর আগামী
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 358 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9C118.957 4.46716 239.043 4.46716 355 9" stroke="#10B981" strokeWidth="6" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            <p className="text-xl text-gray-500 font-medium leading-relaxed mb-10 max-w-lg">
              দাউলখার ফাউন্ডেশন একটি অলাভজনক সংস্থা যা শিক্ষা, স্বাস্থ্য এবং আর্তমানবতার সেবায় কাজ করে যাচ্ছে। আমাদের সাথে যুক্ত হোন।
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto btn-emerald px-10 py-5 text-lg shadow-2xl shadow-emerald-600/30">
                সদস্য হোন <ArrowRight size={20} className="ml-2" />
              </Link>
              <Link href="/login" className="w-full sm:w-auto btn-outline px-10 py-5 text-lg">
                লগইন করুন
              </Link>
            </div>
            
            <div className="mt-16 flex items-center gap-8">
              <div className="flex -space-x-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-2xl border-4 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/150?u=${i}`} alt="User" />
                  </div>
                ))}
              </div>
              <div className="text-sm font-medium text-gray-500">
                <span className="text-gray-900 font-bold">৫০০+</span> সদস্য আমাদের সাথে আছেন
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-all duration-700 border-8 border-white">
              <img 
                src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                alt="Humanity"
                className="w-full h-auto"
              />
            </div>
            <div className="absolute -bottom-10 -left-10 z-20 bg-white p-6 rounded-3xl shadow-2xl border border-gray-50 animate-bounce-slow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Heart className="fill-emerald-600" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">৳ ৫০,০০০+</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">এই মাসে সংগৃহীত</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-gray-900 font-tiro mb-6">আমাদের কার্যক্রম</h2>
            <p className="text-gray-500 font-medium">আমরা স্বচ্ছতা এবং জবাবদিহিতার সাথে আর্তমানবতার সেবায় কাজ করি।</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <ShieldCheck size={32} />, title: "পূর্ণ স্বচ্ছতা", desc: "প্রতিটি দানের হিসাব এবং খরচের বিবরণ সবার জন্য উন্মুক্ত।" },
              { icon: <Globe size={32} />, title: "অনলাইন পেমেন্ট", desc: "সহজেই বিকাশ বা রকেটের মাধ্যমে আপনার চাঁদা পরিশোধ করুন।" },
              { icon: <TrendingUp size={32} />, title: "লাইভ ড্যাশবোর্ড", desc: "ফাউন্ডেশনের বর্তমান অবস্থা এবং কার্যক্রম লাইভ দেখুন।" }
            ].map((feature, i) => (
              <div key={i} className="card-premium p-10 hover:-translate-y-2 transition-all duration-500">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-8">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 font-tiro mb-4">{feature.title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Heart className="text-white fill-white" size={20} />
              </div>
              <span className="text-2xl font-bold font-tiro tracking-tight">দাউলখার ফাউন্ডেশন</span>
            </div>
            <p className="text-gray-400 font-medium leading-relaxed max-w-sm">
              আমরা একটি সুন্দর এবং বৈষম্যহীন সমাজ গড়ার লক্ষ্যে কাজ করছি। আমাদের প্রতিটি পদক্ষেপ মানবতার কল্যাণে।
            </p>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-6 font-tiro">লিঙ্কসমূহ</h4>
            <ul className="space-y-4 text-gray-400 font-medium">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">হোম</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">সদস্য তালিকা</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">অনুদান</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-6 font-tiro">যোগাযোগ</h4>
            <ul className="space-y-4 text-gray-400 font-medium">
              <li>দাউলখার, কুমিল্লা, বাংলাদেশ</li>
              <li>info@daulkhar.org</li>
              <li>+৮৮০ ১৭১২-৩৪৫৬৭৮</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-12 mt-12 border-t border-white/5 text-center text-gray-500 text-sm font-medium">
          © ২০২৬ দাউলখার ফাউন্ডেশন। সর্বস্বত্ব সংরক্ষিত।
        </div>
      </footer>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
