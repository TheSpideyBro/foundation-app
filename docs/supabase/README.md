# Supabase Database — ফাইল ও প্রয়োগের নিয়ম

এই ডিরেক্টরিতে দুটি প্রজেক্টের (Main ও Test) ডাটাবেস ফাইল আলাদা করে রাখা হয়েছে।

| ফাইল / ফোল্ডার | কাজ |
| --- | --- |
| `migrations/` | **Main প্রজেক্টের** (`mlnzxhuozuyidpxepxex`) SQL মাইগ্রেশন — ক্রমানুসারে (প্রথম `20260828_…`, শেষ `20260929_backfill_legacy_donations.sql`) |
| `migrations-test/` | **Test প্রজেক্টের** (`pvfdgrdvvoytsfmjyvde`) মাইগ্রেশন। `save_payment_entry` / `reallocate_payment`-এর আর্গুমেন্ট তালিকা দুই প্রজেক্টে ভিন্ন, তাই Main-এর ফাইল Test-এ চালানো যাবে না (ডুপ্লিকেট overload তৈরি হয়ে PostgREST ভেঙে যায়) — TD-011 দেখুন |
| `schema.sql` | **জেনারেট করা স্ন্যাপশট** (লাইভ ক্যাটালগ থেকে) — রিভিউ ও ডকুমেন্টেশনের জন্য। **হাতে এডিট করবেন না, নতুন ডেটাবেস প্রভিশন করতে এটি রান করবেন না** |
| `config.toml`, `.gitignore` | Supabase CLI কনফিগ |

## মাইগ্রেশন প্রয়োগের ক্রম

১. **নতুন প্রজেক্ট বানালে**: `migrations/`-এর সব ফাইল **ফাইলনামের ক্রমে** Supabase
   Dashboard → SQL Editor-এ একটার পর একটা Run করুন (অথবা `supabase db push`)।
   প্রতিটি ফাইল idempotent (`CREATE OR REPLACE` / `IF NOT EXISTS`)।

২. **লাইভ প্রজেক্টে নতুন পরিবর্তন**: Management API দিয়ে transaction-এ apply করুন:

   ```bash
   python3 /tmp/opencode/apply-sql.py supabase/migrations/<file>.sql
   # POST https://api.supabase.com/v1/projects/<ref>/database/query
   # Authorization: Bearer <SUPABASE_ACCESS_TOKEN>   body: {"query": "BEGIN;\n<file>\nCOMMIT;"}
   ```

   এরপর `NOTIFY pgrst, 'reload schema';` দিন। বিস্তারিত: [../database/MIGRATIONS.md](../database/MIGRATIONS.md)

৩. **প্রতিটি মাইগ্রেশনের পরে যাচাই করুন** (লেখা-সংক্রান্ত হলে):

   ```sql
   SELECT SUM(amount) FROM payment_allocations;  -- এবং
   SELECT SUM(amount) FROM donations;            -- দুটি সমান হতে হবে
   ```

   বর্তমান মান: Main `7,850 = 7,850`, Test `7,442 = 7,442`।

৪. **`schema.sql` রিজেনারেট** করুন:

   ```bash
   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=mlnzxhuozuyidpxepxex \
     python3 scripts/dump-supabase-schema.py > supabase/schema.sql
   ```

## সতর্কতা

- **মাইগ্রেশন লেজার নির্ভরযোগ্য নয়** — লাইভ প্রজেক্টের `supabase_migrations.schema_migrations`
  `20260907194636`-এ থেমে আছে। কী apply হয়েছে তা ক্যাটালগ থেকে যাচাই করুন
  (`scripts/dump-supabase-schema.py`), লেজার থেকে নয়।
- **যে ফাইলগুলো আর নেই** (পুরনো ডকুমেন্টেশনে উল্লেখ থাকলে অগ্রাহ্য করুন):
  `supabase-schema.sql`, `CANONICAL-schema.sql`, `security-policies-fix.sql`,
  `fix-rls-policies*.sql`, `migration-phase1/2.sql`, `apply-missing-tables.sql` —
  সব একটি মাইগ্রেশন সিরিজে মিলিয়ে ফেলা হয়েছে।
- সেটআপ গাইড: [../development/GOOGLE_SHEETS_SETUP.md](../development/GOOGLE_SHEETS_SETUP.md)
