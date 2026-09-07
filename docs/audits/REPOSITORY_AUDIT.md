# Repository Audit

**Audit date:** 2026-09-07
**Auditor:** Claude Code (assisted), on `dev` branch
**Reference:** Git history and live Supabase DB `pvfdgrdvvoytsfmjyvde`

## 1. Purpose

This audit establishes the baseline for the documentation system. The code, database, and git history are the **source of truth**; documentation is derived from them.

## 2. Repository Snapshot

- **Repo**: `fund-app-v2`, branch `dev`
- **Primary language**: TypeScript (React 19 / Next.js 16.2.12)
- **Database**: PostgreSQL via Supabase
- **Migrations**: 9 committed migration files (+ 3 applied to live DB that correspond)
- **Test suite**: 28 unit tests (`tests/payment-ledger.test.ts`) + Playwright E2E
- **Git history**: ~200 commits, `main` + `dev` branches

## 3. Module Inventory

### Frontend Pages (`app/`)
| Route | File | Role Access |
|-------|------|-------------|
| `/` | `app/page.tsx` | public |
| `/login` | `app/login/page.tsx` | public |
| `/signup` | `app/signup/page.tsx` | public |
| `/dashboard` | `app/dashboard/page.tsx` | all |
| `/payments` | `app/payments/page.tsx` | admin, treasurer |
| `/donations` | `app/donations/page.tsx` | all (member view-only) |
| `/expenses` | `app/expenses/page.tsx` | all (member view-only) |
| `/members` | `app/members/page.tsx` | all (staff edit) |
| `/reports` | `app/reports/page.tsx` | admin, treasurer |
| `/profile` | `app/profile/page.tsx` | all |
| `/admin` | `app/admin/page.tsx` | admin, treasurer |
| `/admin/users` | `app/admin/users/page.tsx` | admin |
| `/admin/pledge-history` | `app/admin/pledge-history/page.tsx` | admin |
| `/admin/notices` | `app/admin/notices/page.tsx` | admin, treasurer |
| `/admin/categories` | `app/admin/categories/page.tsx` | admin |
| `/admin/bulk` | `app/admin/bulk/page.tsx` | admin |
| `/admin/audit` | `app/admin/audit/page.tsx` | admin |
| `/admin/pending` | `app/admin/pending/page.tsx` | admin |
| `/admin/members/[id]` | `app/admin/members/[id]/page.tsx` | admin, treasurer |

### API Routes (`app/api/`)
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `payments` | POST/PUT | admin, treasurer + service role | Save/reallocate payment |
| `receipts/[id]` | GET | session | JPEG receipt |
| `members/[id]/qr` | GET | admin | Member QR code |
| `sync-sheets` | POST | admin | Google Sheets backup |
| `restore-sheets` | POST | admin | Google Sheets restore |
| `notify/whatsapp` | POST | admin, treasurer | WhatsApp confirmation |
| `admin/auto-link` | POST | admin | Auto-link users→members |
| `admin/bulk` | POST | admin | Bulk import/export |
| `admin/delete-user` | POST | admin | RPC user deletion |
| `admin/pending-pledges` | GET | admin | Overdue list |
| `admin/reset-password` | POST | admin | Password reset |

### Libraries (`lib/`)
| File | Purpose |
|------|---------|
| `supabase-client.ts` | Browser client singleton |
| `supabase/client.ts` | Browser client (ssr) |
| `supabase/server.ts` | Server client (cookie) |
| `utils.ts` | cn(), Bengali formatting, money, date |
| `payment-ledger.ts` | ★ Canonical allocation engine |
| `audit.ts` | Audit log helper |
| `whatsapp.ts` | WhatsApp Cloud API |
| `sheets-sync.ts` | Google Sheets sync |
| `sheets-auto.ts` | Google Sheets auto-backup |

### Components
`providers.tsx` (AuthProvider), `layout.tsx` (shell), `ui/` (15 shadcn components)

## 4. Database Inventory (Live)

### Tables
`users`, `members`, `donations`, `payment_allocations`, `member_pledge_history`, `expenses`, `notices`, `expense_categories`, `audit_log`

### Views
`member_summary`, `donation_summary`, `expense_summary`, `monthly_collection_summary`

### Functions
`calculate_payment_allocation`, `save_payment_entry`, `reallocate_payment`, `backfill_payment_allocations`, `log_audit_event`, `get_my_role`, `delete_user`

## 5. Findings

### Strengths
1. **Canonical allocation engine** — TS + SQL parity enforced, with a 28-case test suite. Best-in-class area of the app.
2. **Defense-in-depth auth** — middleware + API role checks + RLS. Three layers.
3. **Clean migration history** — chronological SQL files with a live-DB applied state that matches.
4. **Bengali-first UX** — complete localization of money, dates, numerals, receipts.
5. **Vertically-integrated features** — receipts, WhatsApp, Sheets all work end-to-end through API routes.

### Weaknesses / Risks
1. **TD-001** — hardcoded founder email admin bypass (3 files).
2. **TD-002** — `ignoreBuildErrors: true` masks type errors in CI.
3. **Service role key usage** is confined to server routes (good) but the list of routes that need it should be reviewed (payments route also does the WhatsApp notify path via client thereafter).
4. **Documentation does not exist** (this system is being created) — README was thin, no AGENTS.md, no ADRs, no bug/debt tracker.
5. **Two Supabase client implementations** (TD-006) — minor drift risk.
6. **number-to-words duplication** (TD-005).

## 6. Verification Checks Run

- [x] `SUM(payment_allocations.amount) = SUM(donations.amount) = 7,442` on live DB
- [x] Migration files match applied live-DB schema (functions exist, view rewritten)
- [x] All 28 unit tests pass (`pnpm test:ledger`)
- [x] Git history consistent with feature evolution (200 commits, no dangling branches)

## 7. What Documentation Now Records

| Topic | Document |
|-------|----------|
| Vision & purpose | `docs/product/VISION.md` |
| Feature inventory | `docs/product/FEATURE_MAP.md` |
| System architecture | `docs/architecture/SYSTEM.md` |
| Data flows | `docs/architecture/DATA_FLOW.md` |
| Accounting domain | `docs/architecture/ACCOUNTING_DOMAIN.md` |
| Security model | `docs/architecture/SECURITY.md` |
| Database schema | `docs/database/SCHEMA.md` |
| Migration guide | `docs/database/MIGRATIONS.md` |
| Contributing/dev | `docs/development/CONTRIBUTING.md` |
| Roles & permissions | `docs/development/ROLES.md` |
| Project management | `docs/development/PROJECT_MANAGEMENT.md` |
| ADRs | `docs/decisions/ADRs/` |
| Bugs | `docs/decisions/BUGS.md` |
| Technical debt | `docs/decisions/TECH_DEBT.md` |