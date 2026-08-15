# দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন — Fund Management App

> একটি সম্প্রদায় ভিত্তিক তহবিল ব্যবস্থাপনা অ্যাপ — সদস্য, দান, খরচ ও রিপোর্ট সব এক জায়গায়।

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.12-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Deployed](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)](https://vercel.com)
[![PWA](https://img.shields.io/badge/PWA-Support-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![Playwright](https://img.shields.io/badge/E2E-Playwright-green.svg)](https://playwright.dev/)

---

## 📋 সারসংক্ষেপ

এই অ্যাপটি **দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন**-এর জন্য তৈরি করা হয়েছে। এটি একটি **Progressive Web App (PWA)** যা সদস্যদের দান, খরচ, সদস্য তালিকা ও মাসিক/বার্ষিক রিপোর্ট ম্যানেজ করতে সাহায্য করে।

### মূল বৈশিষ্ট্য

| মডিউল | বর্ণনা |
|---|---|
| **ড্যাসবোর্ড** | মোট তহবিল, মোট খরচ, বর্তমান ব্যালেন্স কার্ড; মাসিক বার চার্ট; সাম্প্রতিক লেনদেন |
| **সদস্য** | সদস্য যোগ/সম্পাদনা/মুছুন; নাম বা ফোন দিয়ে সার্চ; সক্রিয়/নিষ্ক্রিয় স্ট্যাটাস |
| **দান** | দান এন্ট্রি (ক্যাস/বিকাশ/নগদ/ব্যাংক); স্বয়ংক্রিয় রিসিপ্ট নম্বর (R-0001, R-0002…); PNG/PDF রিসিপ্ট ডাউনলোড; WhatsApp ওয়েবশেয়ার |
| **খরচ** | ক্যাটাগরি-ভিত্তিক খরচ এন্ট্রি; প্রমাণ ছবি আপলোড (Supabase Storage); মুছুন |
| **রিপোর্ট** | মাসিক/বার্ষিক সারাংশ টেবিল; এক্সেল (.xlsx) এক্সপোর্ট |
| **অ্যাসিস্ট্যান্ট** | শুধুমাত্র অ্যাডমিনের জন্য সদস্য ভূমিকা পরিচালনা |
| **নিরাপত্তা** | Role-based RLS (admin/treasurer/member); Row Level Security; CSRF-সুরক্ষিত |
| **পিডাব্লিউএ** | Service Worker + Web App Manifest — অফলাইন-ফ্রেন্ডলি, ইনস্টলযোগ্য |

### ভাষা ও সংখ্যা পদ্ধতি

- সম্পূর্ণ ইউআই **বাংলায়**
- সকল সংখ্যা **বাংলা লিপিতে** (০১২৩৪৫৬৭৮৯)
- অ্যাকাউন্ট, পরিমাণ, তারিখ সব বাংলায়
- টাকার অঙ্ক বাংলায় লিখিত আকারে (উদা: "দশ হাজার")

---

## 🛠️ টেকনোলজি স্ট্যাক

| স্তর | টেকনোলজি |
|---|---|
| **Frontend** | Next.js 16.2.12 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, shadcn/ui, framer-motion |
| **Auth & Database** | Supabase (PostgreSQL + Auth + Storage) |
| **Charts** | Recharts (ড্যাসবোর্ড বার চার্ট) |
| **Receipt Export** | jspdf (PDF), html-to-image (PNG) |
| **Excel Export** | xlsx, exceljs |
| **E2E Testing** | Playwright |
| **PWA** | Service Worker (cache-first + network-first hybrid) |
| **Deploy** | Vercel (standalone output) |

---

## 📁 প্রজেক্ট গঠন

```
Foundation App/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # রুট লেআউট (AuthProvider, fonts, meta)
│   ├── page.tsx                  # রিডাইরেক্ট (/ → /dashboard অথবা /login)
│   ├── globals.css               # Tailwind + ডিজাইন সিস্টেম কালার
│   ├── dashboard/page.tsx        # ড্যাসবোর্ড
│   ├── members/page.tsx          # সদস্য ম্যানেজমেন্ট
│   ├── donations/page.tsx        # দান এন্ট্রি + রিসিপ্ট
│   ├── expenses/page.tsx         # খরচ এন্ট্রি + প্রমাণ আপলোড
│   ├── reports/page.tsx          # রিপোর্ট + এক্সেল এক্সপোর্ট
│   ├── admin/page.tsx            # অ্যাডমিন প্যানেল (সদস্য ভূমিকা)
│   ├── login/page.tsx            # লগইন/সাইনআপ
│   └── favicon.ico
├── components/
│   ├── providers.tsx             # AuthContext + রোল রিজোলিউশন
│   ├── layout.tsx                # সাইডবার (ডেস্কটপ) + মোবাইল নেভিগেশন
│   └── ui/                       # shadcn/ui কম্পোনেন্ট (15+ টি)
├── lib/
│   ├── supabase-client.ts        # Supabase ব্রাউজার ক্লায়েন্ট + টাইপস
│   ├── utils.ts                  # বাংলা সংখ্যা, টাকা ফরম্যাটিং, তারিখ
│   └── audit.ts                  # অডিট লগ (RPC কল)
├── public/
│   ├── icons/icon-192.png        # PWA আয়কন
│   ├── icons/icon-512.png        # PWA আয়কন (বড়)
│   ├── manifest.json             # Web App Manifest
│   └── sw.js                     # Service Worker
├── reference/                    # ডিজাইন রেফারেন্স
│   ├── full-app-design.jsx
│   └── receipt-design.jsx
├── scripts/
│   └── prepare-standalone.js     # Vercel standalone output প্রস্তুতি
├── tests/                        # E2E টেস্ট
│   ├── e2e-full.js
│   ├── prepare-standalone.sh
│   └── verify-fixes.js
├── supabase-schema.sql           # পূর্ণাঙ্গ ডিবি স্কিমা + RLS নীতি
├── migration-phase1.sql          # অডিট লগ টেবিল ও RPC ফাংশন
├── migration-phase2.sql          # পরিমিতি সংশোধন
├── fix-rls-policies.sql          # RLS সংশোধনী (v1)
├── fix-rls-policies-v2.sql       # RLS সংশোধনী (v2)
├── fix-rls-policies-v3.sql       # RLS সংশোধনী (v3)
├── fix-rls-policies-v4.sql       # RLS সংশোধনী (v4 — সর্বশেষ)
├── apply-missing-tables.sql      # কেস-সেেনসিটিভ টেবিল মেরামত
├── .env.example                  # পরিবেশ চলক নমুনা
├── package.json                  # নির্ভরতা + স্ক্রিপ্ট
├── tsconfig.json                 # TypeScript কনফিগারেশন
├── next.config.ts                # Next.js + security headers + PWA
├── middleware.ts                 # সাইডবার অথ-গেট
└── CLAUDE.md                     # ডিজাইন সিস্টেম নির্দেশিকা
```

---

## 🚀 সেটআপ গাইড

### প্রerequisite

- [Node.js 18+](https://nodejs.org/) ইনস্টল করা থাকতে হবে
- [Supabase](https://supabase.com/) একাউন্ট (ফ্রি টায়ার কাজ করবে)

### ধাপ ১: ডেটাবেস সেটআপ

1. [Supabase Dashboard](https://supabase.com/dashboard) তে গিয়ে নতুন প্রজেক্ট তৈরি করুন
2. **SQL Editor** তে গিয়ে `supabase-schema.sql` ফাইলের সম্পূর্ণ কনটেন্ট চালান
   - এটি সব টেবিল, RLS পলিসি, রিসিপ্ট নম্বর জেনারেটর, এবং `expense-proofs` স্টোরেজ ব্যাকেট তৈরি করবে

### ধাপ ২: পরিবেশ চলক সেটআপ

```bash
cp .env.example .env.local
```

`.env.local` ফাইলে নিচের মানগুলো পূরণ করুন:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase-dashboard
```

মানগুলো Supabase Dashboard → Project Settings → API থেকে পাবেন।

### ধাপ ৩: ডেপেন্ডেন্সি ইনস্টল ও রান

```bash
npm install
npm run dev
```

ব্রাউজারে খুলুন: **http://localhost:3001**

### ধাপ ৪: প্রথম অ্যাডমিন তৈরি

অ্যাপের সাইনআপ ফর্ম থেকে সাধারণ `member` একাউন্ট তৈরি হবে — UI-তে কোনো ভূমিকা পিকার নেই (নিরাপত্তার জন্য)। অ্যাডমিন হিসেবে পেতে:

1. লগইন পেজে "নতুন একাউন্ট" ট্যাবে গিয়ে সাইন আপ করুন
2. Supabase SQL Editor-এ চালান:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
3. লগ আউট করে আবার লগ ইন করুন

### ভূমিকা

| ভূমিকা | অধিকার |
|---|---|
| **admin** | সব কিছু দেখতে/সম্পাদনা/মুছতে পারে; সদস্য ভূমিকা পরিবর্তন করতে পারে |
| **treasurer** | সদস্য, দান, খরচ দেখতে/সম্পাদনা করতে পারে (রিপোর্ট সহ) |
| **member** | শুধুমাত্র ড্যাসবোর্ড দেখতে পারে |

---

## 📦 ডিপ্লয়মেন্ট

### Vercel (সুপারিশকৃত)

1. এই রিপো Vercel-এ ইম্পোর্ট করুন
2. Environment variables যোগ করুন:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy** করুন

অথবা CLI দিয়ে:

```bash
npm run build
npx vercel --prod
```

### কাস্টম সার্ভার

```bash
npm run start
```

এটি `.next/standalone` মোডে চলে — Docker/Node সার্ভারে সরাসরি ব্যবহারযোগ্য।

---

## 🧪 টেস্টিং

```bash
# E2E টেস্ট চালান (Playwright)
npm run test:e2e

# সেটআপ ভেরিফিকেশন (স্ট্যান্ডআলোন + E2E)
npm run test:verify
```

---

## 🎨 ডিজাইন সিস্টেম

এই অ্যাপটি একটি **"লজার/খাতা"** ভিজ্যুয়াল আইডেন্টিটি মেনে চলে:

| উপাদান | মান |
|---|---|
| ইঙ্ক (প্রাথমিক/সাইডবার) | `#1B4332` |
| পেপার (কার্ড ব্যাকগ্রাউন্ড) | `#FBF8F1` |
| পেজ ব্যাকগ্রাউন্ড | `#EDEAE0` |
| বর্ডার | `#E4DCC8` |
| গোল্ড (অ্যাকসেন্ট/অ্যাক্টিভ) | `#C9972D` |
| লাল (খরচ/নেতিবাচক) | `#A63D40` |
| টেক্সট | `#2B2B26` |
| সাব-টেক্সট | `#8A8371` |

### ফন্ট

| ব্যবহার | ফন্ট |
|---|---|
| বাংলা শরীর | **Hind Siliguri** |
| হেডলাইন | **Tiro Bangla** |
| সংখ্যা/টাকা | **JetBrains Mono** |

বেশি বিস্তারিত দেখুন: [`CLAUDE.md`](./CLAUDE.md)

---

## 🔐 নিরাপত্তা

- **Row Level Security (RLS)**: প্রতিটি টেবিলে RLS সক্রিয় — সদস্য কেবল তাদের নিজস্ব ডেটা দেখতে পায়
- **Role-based access**: অ্যাডমিন/ট্রেজারার বনাম সদস্য — ভূমিভিত্তিক অনুমতি
- **Security headers**: CSP, HSTS, X-Frame-Options, Referrer-Policy ইত্যাদি `next.config.ts`-এ কনফিগার করা
- **পাসওয়ার্ড**: Supabase Auth মাধ্যমে hashing — কোনো পাসওয়ার্ড কোডে সংরক্ষিত নয়
- **`.env.local`**: কখনোই committed হবে না — `.gitignore`-এ সংরক্ষিত

> ⚠️ `service-worker.js`-এর জন্য `next.config.ts`-এ `no-store, no-cache` হেডার সেট করা আছে — এতে PWA সবসময় সর্বশেষ ভার্সন পায়।

---

## 📜 লাইসেন্স

এই প্রজেক্টটি [MIT License](./LICENSE) এর আওতায় মুক্ত।

---

## 🤝 অবদান

কোনো ভুল বা নতুন ফিচার আইডিয়া থাকলে [Issue](../../issues) তৈরি করুন অথবা [Pull Request](../../pulls) পাঠান।  
বিস্তারিত দেখুন: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

---

## 📞 যোগাযোগ

প্রজেক্টটি **দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন**-এর জন্য নির্মিত।

---

## 🗺️ রোডম্যাপ

ভবিষ্যৎ উন্নয়নের পরিকল্পনা দেখুন: [`IMPROVEMENT-ROADMAP.md`](./IMPROVEMENT-ROADMAP.md)
