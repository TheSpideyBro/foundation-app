# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/), and the project adheres to semantic versioning where relevant.

## 📅 Date line-up

- First commit: **2026-08-16**
- Latest: **2026-09-07**

---

## [Unreleased]

### Planned / Next Up

These are the items currently queued for the next release. Add new items here as they come up.

- [ ] TD-001: Remove hardcoded founder email bypass, replace with proper role migration
- [ ] TD-002: Remove `ignoreBuildErrors: true`, fix remaining type errors
- [ ] TD-003: Cache `get_my_role()` result to reduce per-RLS-call overhead
- [ ] TD-004: Evaluate SVG/CSS receipt generation as alternative to node-canvas
- [ ] TD-005: Consolidate Bengali number-to-words into single shared utility
- [ ] TD-006: Consolidate two Supabase browser client implementations (see TD-006)
- [ ] TD-007: Unify Excel/PDF export into a single reporting engine
- [ ] Roadmap: per-member monthly collection report (from `payment_allocations`)
- [ ] Roadmap: overdue pledge auto-reminder via WhatsApp
- [ ] Roadmap: receipt PDF export (currently JPEG only)

### Known debt (tracked in [docs/decisions/TECH_DEBT.md](docs/decisions/TECH_DEBT.md))
- TD-001 Hardcoded founder email as admin bypass
- TD-002 `ignoreBuildErrors: true` masks type errors in CI
- TD-003 `get_my_role()` runs per RLS check
- TD-004 Receipt generation is canvas-heavy
- TD-005 Bengali number-to-words converter duplicated
- TD-006 Two browser Supabase client implementations
- TD-007 Excel and PDF export implementations overlap

---

## 2026-09-07 — Canonical Payment Allocations (core accounting milestone)

This is the current stable point on the `dev` branch, verified against the live Supabase database.

### Added
- `payment_allocations` table — the single source of truth for how every donation maps to months (`supabase/migrations/20260907_add_payment_allocations.sql`)
- SQL functions: `calculate_payment_allocation`, `save_payment_entry`, `reallocate_payment`, `backfill_payment_allocations`
- Inline legacy fallback inside `monthly_collection_summary` view so pre-migration data still reads correctly
- Pre-receipt allocation viewing (planned)

### Fixed
- **BUG-001**: SQL allocation engine missing `member.monthly_pledge` fallback — 37 of 40 donations were misallocated to `unallocated`. Now SQL + TS engines are canonical-parity (see [ADR-001](docs/decisions/ADRs/ADR-001-canonical-payment-allocation.md)); allocations backfilled; invariant `SUM(allocations) = SUM(donations)` verified (7,442).
- **BUG-002**: Monthly collection summary dropped months with zero collections — preserved via `generate_series`.

### Changed
- `monthly_collection_summary` view derives `collected_amount` from `payment_allocations` instead of raw `donations`
- Ledger implementation moved to `buildMemberLedgerFromAllocations` (allocation-aware)
- Joma Entry workflow upgraded with live allocation preview using the TS canonical engine

---

## 2026-09-06 — Collection Summary Stabilization

### Added
- Canonical allocation-aware collection summary (first pass)
- Keep-empty-months fix for the summary view

### Fixed
- Dashboard/report period states hardened
- Paid-member filtering now respects covered months (not just received month)

---

## 2026-08-30 → 2026-09-01 — Admin & Security Hardening

### Added
- Admin delete-user RPC + UI control
- Dashboard summary views (`member_summary`, `donation_summary`, `expense_summary`)
- Staff donation permissions
- RLS hardening and integrity constraints migrated to `supabase/migrations/`

### Fixed
- Role-based access control for treasurer and member roles
- Enhanced member privacy restrictions

---

## 2026-08-16 → 2026-08-30 — Foundation & Feature Development

### Added (foundation)
- Next.js 16 + Supabase + Tailwind v4 scaffolding
- Supabase Auth (email + phone), middleware session gate
- Landing, login, signup pages with premium emerald/ledger design language
- Roles: admin / treasurer / member, with role-based UI filtering
- Member management + user↔member linking (manual + auto-link by phone)
- Admin panel: users, notices, categories, bulk import/export, pending pledges, audit log, QR codes, member detail
- Payments: single and multi-month donations with consolidated receipts
- Receipts: premium Bengali JPEG receipts with logo, QR, signature font, amount-in-words, verified badge; download + WhatsApp share
- Reports: period-based donation/expense/member/collector views with Excel (xlsx/exceljs) and PDF (jsPDF) exports
- Dashboard: stat cards, charts (Recharts), collection bar, notices; parallel data fetching
- Integrations: Google Sheets sync/restore, WhatsApp Cloud API alerts
- PWA: manifest, service worker, icons
- Docs: professional documentation suite added to repo root (README, CONTRIBUTING, SECURITY, CoC, CHANGELOG, CI) — later consolidated under `docs/`

### Fixed
- Donation method lowercase normalization; receipt collector FK ambiguity (PostgREST)
- Serverless-compatible receipt generation (node-canvas, no Python dependency)
- PostgREST relation ambiguity in receipt collector join
- Admin hardcoded-email role bypass added as temporary measure (see TD-001)

---

## Legacy Lines

The repository history before the documentation system also includes iterative design/thr/tooling commits (receipt layout refinements, dashboard charting, ESLint fixes, Vercel deploy triggers). Notable:

- **2026-08-15** — Google Sheets auto-backup/restore with clock-skew-tolerant JWT exchange
- **2026-08-XX** — Ledger core (`buildMemberLedger`) + dashboard KPIs + pledge donut data
- Early schema consolidation into `supabase/schema.sql` with audit triggers and views

---

*This changelog is maintained alongside the code. When adding a user-facing change, update the appropriate section above and reference its commit.*