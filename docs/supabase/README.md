# Supabase Database — Schema Files

এই ডিরেক্টরিতে প্রজেক্টের ডাটাবেসের কানোনিকাল (একমাত্র সঠিক) schema ফাইলগুলো রাখা হয়েছে।

| ফাইল | কাজ |
| --- | --- |
| `CANONICAL-schema.sql` | **একমাত্র অফিসিয়াল schema ফাইল।** সব টেবিল, ফাংশন, ট্রিগার ও RLS policies এক ফাইলে। Idempotent — একাধিকবার রান করলে এরর আসবে না। Supabase Dashboard → SQL Editor এ পেস্ট করে Run করুন। |
| `security-policies-fix.sql` | **RLS সিকিউরিটি ফিক্স** (2026-08)। পুরনো `*_bootstrap_anyauth` policies সরিয়ে কঠোর policies বসায়: INSERT/UPDATE/SELECT = admin|treasurer, DELETE = admin only। live DB-তে এই ফাইলটি একবার চালাতে হবে। |
| `google-sheets-setup.md` | Google Sheets sync-এর সেটআপ গাইড। |

## ব্যবহারের ক্রম

১. প্রথমবার (নতুন project): `CANONICAL-schema.sql` রান করুন।
২. live project যেহেতু আগেই রান করা হয়েছে: **শুধু `security-policies-fix.sql` রান করুন** — এটি পুরনো পুরনো policies সরিয়ে সিকিউর policy বসাবে।
৩. প্রথম admin বানাতে: `update users set role = 'admin' where email = 'আপনার email';` (SQL Editor থেকেই — app থেকে নিজেকে admin বানানো যায় না, এটা ইচ্ছাকৃত সুরক্ষা)।

## পুরনো ফাইলগুলো কেন সরানো হয়েছে

আগে রেপোতে ছিল: `supabase-schema.sql` (পুরনো, incomplete), `fix-rls-policies*.sql` (v1–v4 ইটারেটিভ fix), `migration-phase1/2.sql`, `apply-missing-tables.sql` এবং অনেকগুলো debug/verify স্ক্রিপ্ট যা লোকাল টেস্ট আর্টিফ্যাক্ট। সবগুলো মিয়ে **একটি কানোনিকাল ফাইল** (`CANONICAL-schema.sql`) + **একটি সিকিউরিটি ফিক্স** (`security-policies-fix.sql`) রাখা হয়েছে।
