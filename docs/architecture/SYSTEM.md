# System Architecture

## High-Level Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (Mobile/Desktop)               │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Next.js    │  │  Supabase    │  │  Service Worker  │ │
│  │  App Router │  │  Client SDK  │  │  (PWA Cache)     │ │
│  └──────┬─────┘  └──────┬───────┘  └──────────────────┘ │
└─────────┼───────────────┼────────────────────────────────┘
          │               │
          │               ▼
          │  ┌─────────────────────────┐
          │  │   Supabase Platform      │
          │  │  ┌───────────────────┐  │
          │  │  │  PostgreSQL       │  │
          │  │  │  - Tables + RLS   │  │
          │  │  │  - Views          │  │
          │  │  │  - SQL Functions  │  │
          │  │  └───────────────────┘  │
          │  │  ┌───────────────────┐  │
          │  │  │  Auth             │  │
          │  │  │  - Email/Phone    │  │
          │  │  │  - Sessions       │  │
          │  │  └───────────────────┘  │
          │  │  ┌───────────────────┐  │
          │  │  │  PostgREST API    │  │
          │  │  │  (auto REST)      │  │
          │  │  └───────────────────┘  │
          │  └─────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│        Next.js Server (API Routes)       │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ Payment API   │  │ Receipt API      │ │
│  │ /api/payments │  │ /api/receipts/*  │ │
│  └──────┬───────┘  └──────┬───────────┘ │
│         │                  │             │
│  ┌──────┴───────┐  ┌──────┴───────────┐ │
│  │ Admin APIs   │  │ Integration APIs │ │
│  │ /api/admin/* │  │ Sheets, WhatsApp │ │
│  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│      External Services                   │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ Google Sheets│  │ WhatsApp Cloud   │ │
│  │ API          │  │ API              │ │
│  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.12 |
| UI Library | React | 19.2.4 |
| Language | TypeScript | ~5 |
| Styling | Tailwind CSS | 4.0+ |
| Components | shadcn/ui | 15 components |
| Database | PostgreSQL (Supabase) | — |
| Auth | Supabase Auth | @supabase/ssr |
| ORM/Client | Supabase JS | @supabase/supabase-js |
| Charts | Recharts | — |
| PDF | jsPDF | — |
| Excel | xlsx, exceljs | — |
| QR Codes | qrcode (npm) | — |
| Receipt Canvas | canvas (node-canvas) | — |
| Fonts | Bengali: Hind Siliguri, Tiro Bangla; Numbers: JetBrains Mono |
| Testing | Node.js test runner (experimental strip types) | — |
| E2E | Playwright | — |
| PWA | Service Worker, Web App Manifest | — |

## Request Flow

### 1. Client-Side Navigation
```
Browser → Next.js Middleware (auth check) → App Router Page → 
  useEffect → Supabase Client (browser) → Supabase PostgREST → PostgreSQL
```

### 2. Payment Submission (Joma Entry)
```
Browser → /payments page → calculatePaymentAllocation() [client preview]
  → POST /api/payments → cookie-based auth → 
  → service-role Supabase client → save_payment_entry RPC →
  → PostgreSQL: insert donations + payment_allocations + update member →
  → Real-time allocation persisted atomically
```

### 3. Receipt Generation
```
GET /api/receipts/[id] → server Supabase client (cookie auth) →
  → fetch donation + member + collector →
  → node-canvas: draw receipt with Bengali fonts →
  → QR code overlay → JPEG response
```

### 4. Google Sheets Sync
```
POST /api/sync-sheets → admin auth check →
  → sheets-sync.ts: JWT auth with Google Service Account →
  → fetch all data from Supabase →
  → batch update Google Sheets API →
  → response with sync counts
```

## Key Architectural Decisions

### A. Supabase as Full Backend
- **Why**: Rapid development, built-in auth, RLS for security, real-time subscriptions, auto-generated REST API
- **Trade-off**: Vendor lock-in to Supabase, but PostgreSQL is portable
- **Pattern**: Client-side Supabase for reads, server-side service-role for writes that need atomicity

### B. Server-Side Service Role for Payment API
- **Why**: The `save_payment_entry` RPC performs atomic multi-table operations (donation insert + allocation generation + member update) that require elevated privileges
- **Security**: Service role key is NEVER exposed to the browser. API route validates auth cookie + role before using it.
- **File**: `app/api/payments/route.ts` uses `NEXT_SUPABASE_SERVICE_ROLE_KEY`

### C. Canonical Allocation Engine (TS + SQL Parity)
- **Why**: The allocation logic exists in both TypeScript (`lib/payment-ledger.ts`) and SQL (`calculate_payment_allocation`). Both MUST produce identical results.
- **Rule**: The engine resolves pledges with: latest applicable pledge-history entry → member.monthly_pledge → 0, clamped ≥ 0
- **File**: [[payment-ledger-canonical-engine]] memory

### D. Canvas-Based Receipt Generation
- **Why**: Server-side JPEG generation using node-canvas allows embedding Bengali fonts, QR codes, signatures, and logos without browser dependency
- **Trade-off**: Requires `canvas` npm package (native dependency), fonts must be available at `public/fonts/`

### E. PWA with Service Worker
- **Why**: Foundation members may have unreliable internet. PWA provides cached shell and offline page access.
- **Implementation**: `public/sw.js` with network-first strategy for API, cache-first for static assets

## Directory Structure

```
foundation-app/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (fonts, auth, PWA meta)
│   ├── page.tsx            # Landing page
│   ├── login/page.tsx      # Login
│   ├── signup/page.tsx     # Registration
│   ├── dashboard/page.tsx  # Dashboard
│   ├── payments/page.tsx   # Joma Entry
│   ├── donations/page.tsx  # Donation list
│   ├── expenses/page.tsx   # Expense list
│   ├── members/page.tsx    # Member directory
│   ├── reports/page.tsx    # Financial reports
│   ├── profile/page.tsx    # User profile
│   ├── admin/              # Admin pages
│   │   ├── page.tsx        # Admin hub
│   │   ├── users/          # User management
│   │   ├── pledge-history/ # Pledge control
│   │   ├── notices/        # Notice board
│   │   ├── categories/     # Expense categories
│   │   ├── bulk/           # Bulk import/export
│   │   ├── audit/          # Audit log
│   │   ├── pending/        # Pending pledges
│   │   └── members/[id]/   # Member detail (admin)
│   └── api/                # API routes
│       ├── payments/       # Payment CRUD (service-role)
│       ├── receipts/[id]/  # Receipt JPEG generation
│       ├── members/[id]/qr/# Member QR codes
│       ├── sync-sheets/    # Google Sheets backup
│       ├── restore-sheets/ # Google Sheets restore
│       ├── notify/whatsapp/# WhatsApp notifications
│       └── admin/          # Admin APIs
│           ├── auto-link/  # User-member auto-link
│           ├── bulk/       # Bulk operations
│           ├── delete-user/# User deletion (RPC)
│           ├── pending-pledges/ # Overdue alerts
│           └── reset-password/  # Password reset
├── lib/                    # Shared libraries
│   ├── supabase-client.ts  # Browser Supabase client (singleton)
│   ├── supabase/
│   │   ├── client.ts       # Browser client (alternative)
│   │   └── server.ts       # Server client (cookie-based)
│   ├── utils.ts            # cn(), Bengali formatting, money formatting
│   ├── payment-ledger.ts   # ★ Canonical allocation engine
│   ├── audit.ts            # Audit log helper
│   ├── whatsapp.ts         # WhatsApp Cloud API client
│   ├── sheets-sync.ts      # Google Sheets sync
│   └── sheets-auto.ts      # Google Sheets auto-backup
├── components/             # Shared components
│   ├── providers.tsx       # AuthProvider (user, role, memberId)
│   ├── layout.tsx          # App shell (sidebar, bottom nav, drawer)
│   └── ui/                 # shadcn/ui components (15)
├── public/                 # Static assets
│   ├── fonts/              # Bengali fonts (HindSiliguri, TiroBangla, MainakBuniyadi, JetBrainsMono)
│   ├── sw.js               # Service worker
│   └── manifest.json       # PWA manifest
├── supabase/
│   ├── migrations/         # SQL migration files (10)
│   └── schema.sql          # Full schema reference
├── tests/
│   └── payment-ledger.test.ts  # 28 allocation engine tests
├── scripts/                # Build/deploy scripts
├── docs/                   # Documentation (this system)
├── CLAUDE.md               # Design system rules
├── SETUP.md                # Setup guide
├── AGENTS.md               # AI agent instructions
└── package.json            # Project configuration
```
