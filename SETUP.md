# দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন — Fund Management App Setup Guide

## Prerequisites

- Node.js 20+ (Next.js 16 requires it)
- pnpm 9+ (`corepack enable` or `npm i -g pnpm`) — this repo has no `package-lock.json`
- A Supabase account (free tier works)

## Step 1: Set up Supabase

1. Create a two projects (or one, if you only need one environment):

   | Project | Ref | Migrations folder |
   |---------|-----|-------------------|
   | **Main** (production) | `mlnzxhuozuyidpxepxex` | `supabase/migrations/` |
   | **Test** | `pvfdgrdvvoytsfmjyvde` | `supabase/migrations-test/` |

2. Apply the migrations **in filename order** — Supabase Dashboard → SQL Editor
   (paste each file) or `supabase db push`. Start with
   `20260828_harden_rls_and_integrity.sql` and finish with
   `20260929_backfill_legacy_donations.sql`.
3. `supabase/schema.sql` is a **generated snapshot of the live catalog**, useful for
   review — do not run it to provision a new database (the migrations are the
   source of truth). Regenerate it with:

   ```bash
   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=<ref> \
     python3 scripts/dump-supabase-schema.py > supabase/schema.sql
   ```

Full details, including the zero-sum invariant and the Management-API apply
method → [docs/database/MIGRATIONS.md](docs/database/MIGRATIONS.md)

## Step 2: Configure environment variables

```bash
cp .env.example .env.local
```

Fill in at minimum:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never in the browser
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Find them under Project Settings → API. If deploying on Vercel, add the same
values under Project Settings → Environment Variables (Production, Preview and
Development), then redeploy.

## Step 3: Run the app

```bash
pnpm install
pnpm dev
```

Open **http://localhost:3000**

## Step 4: Create your first admin user

The signup form always creates a `member` account with `is_approved = false` —
there is no role picker in the UI, by design (the `handle_new_user()` trigger
hardcodes `member`/`false` and ignores any metadata you send, so a visitor can
never grant themselves admin). To get your first admin:

1. Go to the login page → "নতুন একাউন্ট" tab → sign up normally with your email/password.
2. In the Supabase SQL Editor, run:
   ```sql
   update users set role = 'admin', is_approved = true
   where email = 'your-email@example.com';
   ```
3. Log out and log back in. You're now an approved admin.

Both columns matter: `role` grants the permissions, `is_approved` releases the
"awaiting approval" gate (`isApproved()` in `lib/auth.ts` fails closed — only an
explicit `true` passes).

To give someone else access later, have them sign up, then run the same query
with `'admin'`, `'treasurer'`, or leave them as `'member'`.

## Project Structure

```
app/
  layout.tsx            — Root layout with AuthProvider
  page.tsx              — Redirects to /login or /dashboard
  login/ signup/        — Auth screens
  dashboard/            — Stats, collection summary, recent entries
  joma/                 — Joma Entry (payment + live allocation preview)
  donations/ expenses/  — Lists, edit/delete, receipt preview
  members/ profile/     — Member directory, own profile
  reports/              — Monthly/yearly summary + Excel/PDF export
  admin/                — users, pledge-history, notices, categories,
                          bulk, audit, pending, members/[id]
  api/                  — payments, receipts, member QR, sheets sync/restore,
                          whatsapp, admin/* (all behind requireAuth)
components/
  providers.tsx         — Auth context (user, role, isApproved, memberId)
  layout.tsx            — Sidebar + responsive navigation shell
lib/
  payment-ledger.ts     — ★ canonical allocation engine (TS side)
  auth.ts               — FOUNDER_EMAIL + isStaff/isAdmin/isApproved
  server-auth.ts        — requireAuth() for API routes
  supabase-client.ts    — browser client (singleton + loud mock fallback)
  supabase/server.ts    — cookie-based server client
  utils.ts              — Bengali formatting, local-date helpers
supabase/
  migrations/           — SQL for the Main project (apply in order)
  migrations-test/      — SQL for the Test project (signatures differ)
  schema.sql            — generated snapshot — never edit by hand
scripts/                — prepare-standalone.js, dump-supabase-schema.py
tests/                  — payment-ledger.test.ts (28), e2e/, verify-fixes.js
docs/                   — Documentation system (start at docs/README)
```

## Features

- **Auth & RBAC**: Supabase Auth + 3 roles (`admin` / `treasurer` / `member`),
  `requireAuth()` on every API route, RLS on all tables, approval gate
- **Joma Entry**: payment form with **live allocation preview** computed by the
  same canonical algorithm as the DB, multi-month coverage, extra amount
- **Receipts**: server-generated Bengali JPEG with QR (`/api/receipts/[id]`),
  preview/download, WhatsApp share
- **Dashboard**: collection vs target, expenses, net balance, recent entries
- **Donations / Expenses / Members**: CRUD, search, status, per-member ledger,
  member QR codes
- **Reports**: monthly/yearly/total views built from `payment_allocations`,
  Excel (xlsx) and PDF (jsPDF) export
- **Pledge control**: pledge history with effective months, bulk import/export
- **Notices**: notice board with admin management
- **Audit log**: written by DB triggers, admin-only view
- **Integrations**: Google Sheets backup/restore, WhatsApp Cloud API notify
- **Responsive + Bengali UI**: all text in Bangla, Bengali numerals, Bengali months

## Design System

Follows the modern emerald identity (details in [CLAUDE.md](CLAUDE.md)):

- Emerald primary theme (#059669 / #064E3B), white card backgrounds (#FFFFFF)
- Amber accent (#F59E0B) for targets and warnings
- Rose for expenses/negative amounts (#E11D48 / rose-600)
- Fonts: Hind Siliguri (body), Bengali locale numerals for money (`৳` + `bn-BD`)

## Verification before you ship

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build              # type-checked, no ignoreBuildErrors
pnpm test:ledger        # 28 canonical allocation cases
pnpm test:e2e           # Playwright (authenticated cases need TEST_EMAIL/TEST_PASSWORD)
```

CI runs the same four on every push to `main` (`.github/workflows/ci.yml`).
