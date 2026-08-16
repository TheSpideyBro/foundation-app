# Google Sheets অটো-ব্যাকআপ সেটআপ গাইড

এই গাইড অনুসরণ করলে অ্যাপের Member, Donation, Expense ডেটা সবসময় স্বয়ংক্রিয়ভাবে আপনার Google Spreadsheet-এ ব্যাকআপ হয়ে থাকবে — এবং দরকার হলে Sheets থেকেই সব Data আবার Restore করা যাবে।

## ১. কিভাবে কাজ করে

আপনি App-এ যেকোনো Member/Donation/Expense যোগ, এডিট বা ডিলিট করলে অ্যাপ সেই মুহূর্তেই (কিছু সেকেন্ডের মধ্যে) Google Sheet আপডেট করে। তিনটি আলাদা ট্যাবে ডেটা রাখা হয়: **Members**, **Donations**, **Expenses**। Admin প্যানেলের "Google Sheets" ট্যাব থেকে যেকোনো সময় হাতে "এখনই Sync" বা "Sheets থেকে Restore" করা যায়।

ডেটাবেসই সবসময় মূল উৎস (Source of Truth)। Restore বাটন শুধু জরুরি মুহূর্তে — ডেটাবেস নষ্ট হয়ে গেলে — ব্যবহার করবেন।

## ২. প্রস্তুতি: Google Cloud Service Account (একবারই লাগবে)

### ধাপ ১ — Google Cloud Console-এ যান
1. [console.cloud.google.com](https://console.cloud.google.com) এ গিয়ে নিজের Gmail দিয়ে login করুন।
2. উপরে নতুন **Project** তৈরি করুন (নাম যেকোনো, যেমন `foundation-backup`)।

### ধাপ ২ — Sheets API অন করুন
1. বাম মেনুতে **APIs & Services → Library** যান।
2. খুঁজুন **"Google Sheets API"** → **Enable** চাপুন।

### ধাপ ৩ — Service Account Key তৈরি করুন
1. বাম মেনুতে **IAM & Admin → Service Accounts** যান।
2. **Create Service Account** চাপুন → নাম দিন (যেমন `sheets-sync`) → Create → Create।
3. তৈরি হওয়ার পর Service Account-এ ক্লিক করুন → **Keys** ট্যাবে যান → **Add Key → Create new key → JSON** নির্বাচন করুন।
4. একটি `.json` ফাইল ডাউনলোড হবে। এই ফাইলই আপনার মূল secret key।

### ধাপ ৪ — Spreadsheet-এ অ্যাক্সেস দিন
1. ডাউনলোড হওয়া JSON ফাইলটি খুলুন, `client_email` লাইনের email-টি কপি করুন (দেখতে এরকম: `sheets-sync@foundation-backup.iam.gserviceaccount.com`)।
2. Google Sheets-এ একটি নতুন Spreadsheet বানান, নাম দিন (যেমন `Foundation Backup`)।
3. Spreadsheet-এ **Share** বাটন চাপুন → email টি past করুন → **Editor** রোল দিয়ে Share করুন।
4. URL-এর এই অংশটি কপি রাখুন: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit` — মাঝের `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms` অংশটিই `GOOGLE_SHEET_ID`।

## ৩. App-এ কনফিগার

`foundation-fund-app` ফোল্ডারের `.env.local` ফাইলে নিচের দুই লাইন যোগ করুন:

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"sheets-sync@foundation-backup.iam.gserviceaccount.com","client_id":"..."}
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

দুটি বিষয় লক্ষ্য করুন:
- `GOOGLE_SERVICE_ACCOUNT_JSON`-এর মান পুরো JSON — **একই লাইনে** থাকতে হবে। ভিতরের লাইন-ব্রেক `\\n` (escaped) হিসেবে থাকবে, আসল Enter থাকবে না। বেশিরভাগ ক্ষেত্রে JSON ফাইলে Enter-এর জায়গায় মানুষীভাবে `\n` বসিয়ে দিন।
- `GOOGLE_SHEET_ID`-এ শুধু spreadsheet id, কোনো slash বা edit নয়।

এরপর অ্যাপ রিস্টার্ট করুন (বন্ধ করে আবার `npm run dev` বা `npm start`)।

## ৪. প্রথম Sync ও যাচাই

1. App login করে **অ্যাডমিন প্যানেল → Google Sheets** ট্যাবে যান।
2. "**এখনই Sync**" বাটন চাপুন — সফল হলে তিন ট্যাবের row সংখ্যা দেখাবে।
3. Spreadsheet খুলে দেখুন — Members, Donations, Expenses ট্যাবে ডেটা চলে এসেছে।
4. এরপর Member/Donation/Expense যোগ করুন — কয়েক সেকেন্ডের মধ্যে Sheet আপডেট হয়ে যাবে।

## ৫. Restore (ডেটাবেস হারালে)

1. প্রথমে নিশ্চিত হন Sheets-এর ডেটা সবচেয়ে শেষ সংস্করণ (Spreadsheet নিজে এডিট করবেন না — সেটা sync-এ পুনরায় লেখা হয়ে যেতে পারে)।
2. অ্যাডমিন প্যানেল → Google Sheets ট্যাব → "**Sheets থেকে Restore**" চাপুন।
3. একই id-র record আপডেট হবে, শুধু Sheets-এ থাকা নতুন record যোগ হবে — ডুপ্লিকেট হবে না।

## ৬. নিরাপত্তা পরামর্শ

- `GOOGLE_SERVICE_ACCOUNT_JSON`-এর JSON ফাইল কখনো GitHub-এ পাঠাবেন না বা কাউকে দেখাবেন না। এটি service role key-এর মতোই secret।
- Google Cloud-এর Project টি শুধু আপনি নিজে access করবেন।
- চাইলে পরবর্তীতে JSON key rotate করতে পারবেন (পুরনো key Delete → নতুন তৈরি → .env.local আপডেট)।
- E2E/যেকোনো টেস্ট চালানোর পর ডাটাবেসের টেস্ট ডেটা পরিষ্কার হলে Sheets-ও পরবর্তী mutation-এ সেটা হয়ে পরিষ্কার হয়ে যাবে (শেষ sync-এর snapshot)।

## ৭. সমস্যা সমাধান

| লক্ষণ | সমাধান |
|-------|--------|
| Admin ট্যাবে "সেটআপ সম্পন্ন নয়" দেখায় | .env.local-এ দুটো ভ্যারিয়েবল আছে কিনা চেক করুন; App রিস্টার্ট করুন |
| "Sync ব্যর্থ: ..." এরর | JSON key ঠিকমতো এক লাইনে আছে কিনা, client_email-কে Spreadsheet-এ Editor access দেওয়া হয়েছে কিনা দেখুন |
| Sheet-এ কিছুই আসছে না | Spreadsheet URL-এর ঠিক id বসানো হয়েছে কিনা চেক করুন; browser console-এ এরর দেখুন |
| Sync হচ্ছে না / দেরি হচ্ছে | ইন্টারনেট সংযোগ যাচাই করুন; Admin ট্যাবে হাতে "এখনই Sync" চাপুন |
