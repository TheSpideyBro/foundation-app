# Foundation Fund App — Final Package (Fixes + Phase 1 + Phase 2)

এই প্যাকেজে সব bug fix + Phase 1 (৭টি ফিচার) + Phase 2 (৩টি ফিচার) অন্তর্ভুক্ত। Admin-এর জন্য সব CRUD (add/edit/delete) কাজ করে এব
ং **delete শুধুমাত্র admin role-এর জন্য** — UI-তে (অন্যদের delete button লুকানো) এব
ং database-এ (RLS policy)।

## Required SQL (Supabase SQL Editor-এ Run করুন)

৩টি SQL ফাইল এই ক্রমে রান করুন (সব idempotent — multiple বার রান করলেও সমস্যা নেই, "already exists" এরর আর আসবে না):

1. **`fix-rls-policies-v3.sql`** (প্রথমে) — admin-only DELETE policies database-এ নিশ্চিত করে (members/donations/expenses)। **এটি এখন idempotent — multiple বার রান করলেও "policy already exists" এরর আসবে না।**
2. **`migration-phase1.sql`** — expense_categories table, সদস্যের monthly_pledge column, দানের donation_month column, ডিফল্ট ক্যাটেগরি seed, RLS policies।
3. **`migration-phase2.sql`** (শেষে) — audit_log table + log_audit_event() RPC + audit log-এর RLS policies।

রান করার পর app থেকে **sign out → sign in** করুন।

## নতুন ফিচার সমূহ

### Phase 1

| # | ফিচার | ব্যবহার |
|---|--------|----------|
| 1 | **আলাদা অ্যাডমিন সেকশন** (`/admin`) | নেভবারে "অ্যাডমিন" (শুধু admin দেখে)। ৪টি ট্যাব: (ক) ব্যবহারকারী — role member/treasurer/admin পরিবর্তন ও delete, (খ) খরচের ক্যাটেগরি manage, (গ) অডিট লগ, (ঘ) সিস্টেম তথ্য। |
| 2 | **খরচের ক্যাটেগরি (দুই মোড)** | খরচ ফর্মে ড্রপডাউন থেকে fixed ক্যাটেগরি বাছাই করুন, অথবা "নিজস্ব" বাছাই করে নিজের লেখা ক্যাটেগরি দিন। |
| 3 | **সদস্যের দানের ইতিহাস** | সদস্য কার্ডের ঘড়ি আইকনে click → সেই সদস্যের সব দান + মোট অঙ্কের modal। |
| 4 | **মাসিক প্রতিশ্রুতি (Monthly Pledge)** | সদস্য যোগ/সম্পাদনায় "প্রতি মাসে প্রতিশ্রুতি" ফিল্ড; দান যোগে "কোন মাসের দান" সেলেক্ট (English মাস: January–December)। |
| 5 | **Excel ইন্টিগ্রেশন** | রিপোর্ট পেজে "Excel ডাউনলোড" → ৩ শিট: মাসিক সারাংশ, সদস্যভিত্তিক দান, ক্যাটেগরিভিত্তিক খরচ। |
| 6 | **Forgot Password** | Login পেজে "পাসওয়ার্ড ভুলে গেছেন?" — রিসেট লিংক email-এ যাবে (SMTP settings দরকার)। |
| 7 | **বার্ষিক PDF রিপোর্ট** | রিপোর্ট পেজে বছর বেছে "PDF রিপোর্ট" — বাংলা সারাংশ। |

### Phase 2

| # | ফিচার | ব্যবহার |
|---|--------|----------|
| 8 | **Dashboard Charts** | ড্যাশবোর্ডে দুটি চার্ট: (ক) Pie chart — ক্যাটেগরিভিত্তিক খরচের ভাগ, (খ) Line chart — গত ৫ বছরের বছরভিত্তিক দানের trend। |
| 9 | **Audit Log** | Admin প্যানেলের "অডিট লগ" ট্যাব — কে কোন সময় কী কাজ (add/edit/delete) করেছে তার record, CSV ডাউনলোড অপশন সহ। প্রতিটি গুরুত্বপূর্ণ কাজ অটো record হয়। |
| 10 | **Premium রসিদ (Receipt Redesign)** | দান এন্ট্রি পেজে রসিদ আইকন → নতুন premium রসিদ modal: serif Bengali ফন্ট, foundation seal, প্রতিষ্ঠিত/যোগাযোগ strip, রসিদ নং বাংলায়, টাকার পরিমাণ কথায় (auto-convert), teal amount box, method pill, signature block। PNG ডাউনলোড ও শেয়ার বাটন সহ। |
| 11 | **PWA (মোবাইলে Install)** | মোবাইলে Chrome → মেনু → "Add to Home Screen"; iPhone-এ Safari → Share → "Add to Home Screen"। App icon সহ home screen-এ install হবে এবং offline-এও static pages খুলবে। |
| 12 | **Google Sheets অটো-ব্যাকআপ** | Member/Donation/Expense add/edit/delete করলে কয়েক সেকেন্ডের মধ্যে Google Spreadsheet-এর Members/Donations/Expenses ট্যাবে অটো sync হয়। Admin প্যানেলের "Google Sheets" ট্যাব থেকে "এখনই Sync" ও "Sheets থেকে Restore" করা যায় — ডেটাবেস হারালে Sheets থেকেই সব ফেরত আনা যায়। সেটআপ: `docs/google-sheets-setup.md` দেখুন। |

## Setup (Windows PowerShell)

1. Extract করে project ফোল্ডারে যান
2. `npm install`
3. `.env.local` আপনার Supabase credentials সম্বলিত থাকবে (rotate করুন — নিচে দেখুন)
3b. (ঐচ্ছিক) Google Sheets অটো-ব্যাকআপ চালু করতে চাইলে `.env.local`-এ `GOOGLE_SERVICE_ACCOUNT_JSON` ও `GOOGLE_SHEET_ID` যোগ করুন — পুরো স্টেপ-বাই-স্টেপ গাইড: `docs/google-sheets-setup.md`। সেটআপ ছাড়া app পুরোপুরি কাজ করবে, শুধু অটো-ব্যাকআপ বন্ধ থাকবে।
4. `npm run dev` → http://localhost:3000 (Production: `npm run build` → `npm start`)

> **⚠ গুরুত্বপূৰ্ণ (Google Sheets env):** `.env.local`-এ `GOOGLE_SERVICE_ACCOUNT_JSON`-এর মান হলো সরাসরি কি JSON-এর কনটেন্ট — পুরো মানকে `"` দিয়ে wrap করবেন না। JSON-এর ভেতরে `\n` escape যথাবতে থাকবে। Vercel/যেকোনো dashboard-এ env variable হিসেবে বসালে `"` দিয়ে wrap করতে হবে (dashboard নিজেই outer quotes হ্যান্ডল করে)। ভুল ফরম্যাট হলে sync route 500 দেবে। সঠিক আছে কিনা চেক: Admin → Google Sheets ট্যাব → "সেটআপ সম্পূর্ণ ✓" এবং **Sync Now** চাপলে `ok: true` আসবে। অগোছালো .env.local ঠিক করতে: `node scripts\fix-env-google.js` (Windows PowerShell-এ) অথবা নতুন ডাউনলোড করা কি ফাইল দিয়ে `node scripts\fix-env-google.js path\to\service-account.json`।

> **নোট:** `npm start` (production) এবার ঠিকভাবে কাজ করে — `output: standalone`-এর সাথে মানানসই করে `prepare:standalone` script ও PWA asset exclusion middleware fix করা হয়েছে।
5. Login: saddamakash234@gmail.com / 123456

## Rotate your Supabase keys

`ANON_KEY` ও `SERVICE_ROLE_KEY` debugging-এ share করা হয়েছিল। Setup ঠিক হলে: Supabase Dashboard → **Settings → API** → "Generate new key pair" → `.env.local` আপডেট → `npm run dev` restart।

## কী কী Fix ছিল (আগের প্যাকেজ থেকে)

Middleware crash fix, infinite loading spinner fix, logout redirect, expense delete/upload error handling, receipt modal propagation, Invalid Date guard, CSP relaxation, duplicate GoTrueClient fix, Bengali login error messages, profile bootstrap + role resolution, admin-only delete buttons (UI), DB-level admin-only DELETE policies (fix-rls-policies-v3.sql)।

## Verifying locally

সব ১১টি E2E চেক পাস করেছে। নিজে ভেরিফাই: `npx playwright install chromium` তারপর `node tests\e2e-full.js`

## Existing data note

Debugging/Test run-এ যোগ হওয়া সব test member/donation/expense ডেটাবেস থেকে মুছে দেওয়া হয়েছে। আপনার ডেটাবেসে এখন নতুন করে সদস্য/দান/খরচ যোগ করুন — tables ঠিক আছে, app পুরোপুরি কাজ করছে। (মনে রাখবেন: `migration-phase1.sql` ও `migration-phase2.sql` SQL Editor-এ রান না করলে নতুন ফিচারগুলো (charts, audit log, ক্যাটেগরি ম্যানেজ) সক্রিয় হবে না।)
