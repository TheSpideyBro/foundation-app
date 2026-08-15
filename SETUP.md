# দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন — Fund Management App Setup Guide

## Prerequisites
- Node.js 18+
- Supabase account (free tier works)

## Step 1: Set up Supabase

1. Create a new project at https://supabase.com
2. Go to **SQL Editor** and run the entire contents of `supabase-schema.sql` once.
   This creates all tables, RLS policies, the receipt-number generator, and the
   `expense-proofs` storage bucket — everything in one script, nothing else to set up.

## Step 2: Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase-dashboard
```

You can find these values in your Supabase project settings → API.
If deploying on Vercel, add the same two variables under Project Settings →
Environment Variables (for Production, Preview, and Development), then redeploy.

## Step 3: Run the app

```bash
npm run dev
```

Open http://localhost:3001

## Step 4: Create your first admin user

The signup form always creates a regular `member` account — there's no role
picker in the UI, by design (you don't want random visitors granting
themselves admin access). To get your first admin:

1. Go to the login page → "নতুন একাউন্ট" tab → sign up normally with your email/password.
2. In Supabase SQL Editor, run:
   ```sql
   update users set role = 'admin' where email = 'your-email@example.com';
   ```
3. Log out and log back in. You're now an admin and can manage members, donations, and expenses.

To give someone else access later, have them sign up, then run the same
`update users set role = ...` query with `'admin'`, `'treasurer'`, or leave
them as `'member'`.

## Project Structure

```
app/
  layout.tsx          — Root layout with AuthProvider
  page.tsx            — Redirects to /login or /dashboard
  login/page.tsx      — Login/Signup page
  dashboard/page.tsx  — Dashboard with stats & chart
  members/page.tsx    — Member CRUD with search
  donations/page.tsx  — Donation entries + receipt generation
  expenses/page.tsx   — Expense entries with image upload
  reports/page.tsx    — Monthly/yearly summary + Excel export
components/
  providers.tsx       — Auth context wrapper
  layout.tsx          — Sidebar + responsive navigation shell
lib/
  supabase-client.ts  — Supabase client + TypeScript types
  utils.ts            — Bengali number formatting helpers
supabase-schema.sql   — Database schema + RLS policies
.env.local.example    — Environment variable template
```

## Features

- **Auth**: Login/signup with Supabase Auth, 3 roles (admin/treasurer/member)
- **Dashboard**: Total fund, total expense, balance cards; monthly bar chart; recent entries
- **Members**: Add/edit/delete members, search by name or phone, status toggle
- **Donations**: Entry form, list view, receipt generation (PNG/PDF download, WhatsApp share, Web Share API)
- **Expenses**: Category-based entries, image proof upload, delete
- **Reports**: Monthly summary table, Excel export
- **Responsive**: Mobile hamburger menu, stacked layouts on small screens
- **Bengali UI**: All text in Bangla, Bengali numerals, Bengali months

## Design System

Follows the "ledger/khata" identity from `/reference`:
- Ink green sidebar (#1B4332), paper card backgrounds (#FBF8F1)
- Gold accent for active nav, buttons (#C9972D)
- Red for expenses/negative amounts (#A63D40)
- Fonts: Hind Siliguri (body), Tiro Bangla (headings), JetBrains Mono (numbers/money)
