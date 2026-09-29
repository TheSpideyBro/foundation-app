# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/), and the project adheres to semantic versioning where relevant.

## 📅 Date line-up

- First commit: **2026-08-16**
- Latest: **2026-09-29**

---

## [Unreleased]

### Added
- `scripts/dump-supabase-schema.py`: regenerates `supabase/schema.sql` as executable DDL from the live catalog (tables, constraints, FKs, indexes, RLS, verbatim policies/functions with their EXECUTE grants, triggers, views, grants) — the hand-written file had drifted badly (TD-008).
- `supabase/migrations-test/`: separate migration folder for the Test project — its `save_payment_entry`/`reallocate_payment` signatures differ from Main, so replaying Main's files there would create broken overloads (TD-011).

### Removed
- **34 dead files**: unreferenced one-off tooling (`scripts/capture-*.cjs`, `fix-env-google.js`, `live-fullsync.js`, `receipt_generator.py`, `verify-member-actions.cjs`), superseded smoke tests (`tests/e2e-full.js`, `live-sheets-test.js`, `validate-full-schema.js`, `verify-clean.js`), Next.js boilerplate SVGs (`public/next.svg`, `vercel.svg`, `window.svg`, `globe.svg`, `file.svg`), root-level work reports (`HIGH_PRIORITY_FIXES.md`, `VERIFICATION_REPORT.md` — superseded by CHANGELOG/COMMIT_LOG), the unused Google Sheet sample (`docs/sheets/*.xlsx`), and `lib/sheets-auto.ts` (no importers).
- **`components/ui/*` (15 shadcn components) + `components.json`** — nothing imported them; the UI is plain React + Tailwind + lucide-react.
- **8 unused dependencies**: `@base-ui/react`, `framer-motion`, `recharts`, `html-to-image`, `date-fns`, `class-variance-authority`, `tw-animate-css`, `shadcn`; `playwright` moved from `dependencies` to `devDependencies`.
- **CI fixed**: `.github/workflows/ci.yml` ran `npm ci`, which can no longer work since `package-lock.json` was dropped — now pnpm on Node 22, and it runs `pnpm test:ledger`.

### Security
- **BUG-015**: `save_payment_entry()` / `reallocate_payment()` / `backfill_payment_allocations()` are `SECURITY DEFINER` with no internal auth check and were executable by `anon` (and `authenticated` on Main); all summary views — including `audit_log_view` on Test — granted `SELECT` to `anon`, exposing member/pledge data and the audit trail with no session. Write RPCs are now `service_role`-only and `anon` has no view access, on **both** Supabase projects (Main `mlnzxhuozuyidpxepxex`, Test `pvfdgrdvvoytsfmjyvde`).
- **BUG-017**: `generate_receipt_no()` had no lock and `lpad()` truncated the sequence (`991783` → `R-9917`), guaranteeing a UNIQUE collision. Now takes `pg_advisory_xact_lock` and pads only when needed (both projects).
- **BUG-018**: `members_update_own` let a member rewrite their own `monthly_pledge`, `status` or `join_date`. New `trg_member_self_update` trigger restricts self-service updates to name/address/phone (both projects).
- **BUG-016**: the Joma pledge change was validated by the API and then dropped by `save_payment_entry()` on Main; on Test the history row was written but `members.monthly_pledge` was never updated, and `reallocate_payment()` didn't store the new coverage window. All fixed.
- **BUG-012**: Sign-up metadata set `role`/`is_approved` and the `handle_new_user()` trigger trusted it — self-registered admins were possible. Migration `supabase/migrations/20260929_harden_handle_new_user_role.sql` hardcodes `member`/`false` (**applied to Main and Test**); signup no longer sends the fields; `ensureProfile()` hardcodes them too.
- **BUG-014**: `POST /api/notify/whatsapp` had no auth at all; `/admin/members/[id]` had no role gate; admin tiles were visible to every role. Every API route now goes through `requireAuth("staff"|"admin")` (`lib/server-auth.ts`), which also enforces `is_approved === true`.
- New `lib/auth.ts`: single `FOUNDER_EMAIL` constant + `isStaff`/`isAdmin`/`isApproved` — the 16 inlined founder-email literals are gone. `isApproved()` now fails closed (`=== true`), which the new `NOT NULL` constraint makes safe.
- `lib/supabase-client.ts`: mock client now throws `SUPABASE_NOT_CONFIGURED` on writes instead of silently no-oping.

### Fixed
- **CI is green for the first time** (`main CI 36613578576` — Lint ✓ Build ✓ E2E ✓, previously failing since 2026-09-14). Beyond the pnpm switch: the E2E job no longer runs `prepare:standalone` without a build (Playwright starts its own server), and `webServer.command` now `exec`s `./node_modules/.bin/next dev` so Playwright can signal the server on teardown instead of waiting forever on an orphaned process.
- **BUG-019**: On Main, `SUM(donations) = 7,850` but `SUM(payment_allocations) = 3,300` — the 14 donations recorded before 2026-09-08 had no allocation rows and `backfill_payment_allocations()` was missing from the project. Migration `20260929_backfill_legacy_donations.sql` restores the function, pins the legacy coverage months, backfills and asserts the zero-sum invariant (now `7,850 = 7,850`, `unbackfilled = 0`; Test was already `7,442 = 7,442`).
- **BUG-020**: Live `monthly_collection_summary` still ran the pre-ADR-002 definition (greedy, computed from `donations`, ignoring coverage months) because `20260907_monthly_collection_summary_from_allocations.sql` was never applied — two allocation algorithms were live at once. Applied to Main. **User-visible:** reported collection for 2026-09 changes 4,350 → 3,000 and 2026-08 changes 400 → 500; Reports/Dashboard now reconcile row-by-row with `payment_allocations`.
- **BUG-013**: Default dates/current month were computed in UTC — the Joma form and every admin page defaulted to *yesterday* between 00:00–06:00 local time. Added `todayISO`/`currentMonthStr`/`toLocalISODate` to `lib/utils.ts` and converted all call sites.
- **BUG-011**: Joma Entry and all staff-facing API routes (payments, admin/auto-link, admin/reset-password, sync-sheets, restore-sheets) returned 401 Unauthorized on every request due to a broken manual cookie parser. Replaced with the canonical `createClient()` from `lib/supabase/server.ts`.
- **BUG-006** (follow-up): Dashboard " syncing" button called wrong `/api/sheets/sync` path — fixed to `/api/sync-sheets`.
- **BUG-007** (follow-up): Dashboard showed a fabricated "অ্যাক্টিভিটি স্কোর ৯৪%"; replaced with real `stats.netBalance`.
- **BUG-008** (follow-up): "বকষয় সদস্য় দেখুন" link to `/admin/pending` was visible to all roles — now admin-only.
- **BUG-009** (follow-up): Unapproved members could access the full app instead of seeing the approval-pending screen. Added approval gate in `layout-wrapper`.
- `app/layout.tsx`: Removed `maximumScale: 1` to re-enable pinch-zoom for accessibility.
- `package.json`: Removed unsupported `--experimental-default-type=module` flag from `test:ledger`.
- Joma entry: client-side validation now actually runs (the page has no `<form>`, so `required`/`min` never did); pledge-change edits are no longer silently dropped via `parseFloat(x) || null`; the confirm dialog shows the extra amount before the irreversible save; editing the member search box no longer keeps the previously selected member; the collector dropdown no longer resets itself on every auth token refresh; a duplicate receipt number is reported as "probably already saved" instead of a raw Postgres error; "নতুন জমা" clears the success state instead of duplicating "জমা তালিকা".
- `/reports`: "সংগ্রহ", "বকেয়া" and "সংগ্রহের হার" all derive from `monthly_collection_summary` (one source) instead of mixing donations rows with summary rows, so the three cards and the chart reconcile.
- `/dashboard`: a failed load shows an error + retry instead of rendering all-zero stats as if there were no data; founder-role gates use `isStaff`/`isAdmin`.
- `/members`: cleared pledge input no longer writes `NULL`; a pledge-history row is only inserted when the pledge actually changed; QR download failures are reported.
- `/donations`: period filter and totals use coverage months (multi-month collections are no longer counted twice); `extra_amount` is included in totals; staff-gated delete with a busy state.
- Silenced-read sweep: `/expenses`, `/profile`, `/admin/notices`, `/admin/categories`, `/admin/members/[id]` and the users link-modal all dropped Supabase `error` objects, so a denied/failed read rendered as an empty list. Each now surfaces an error banner with retry (or an alert).
- Receipt route: shared `numberToWordsBengali` from `lib/utils.ts` — the local copy printed `undefined হাজার` for amounts ≥ 10,000.
- `next.config.ts`: `ignoreBuildErrors` removed (TD-002) — the build type-checks again.
- Dropped unused `exceljs` and stale `package-lock.json`; deleted unused `lib/supabase/client.ts`; `.env.example` documents `NEXT_SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `WHATSAPP_*`.

### Planned / Next Up

These are the items currently queued for the next release. Add new items here as they come up.

- [x] TD-001: Founder email bypass centralized in `lib/auth.ts` (removal still open — needs the live role row verified)
- [x] TD-002: `ignoreBuildErrors: true` removed
- [ ] TD-003: Cache `get_my_role()` result to reduce per-RLS-call overhead
- [ ] TD-004: Evaluate SVG/CSS receipt generation as alternative to node-canvas
- [x] TD-005: Bengali number-to-words consolidated into `lib/utils.ts`
- [x] TD-006: Duplicate Supabase browser client deleted
- [x] TD-007: `exceljs` removed (unused); `xlsx` + `jsPDF` remain
- [x] TD-008: `supabase/schema.sql` regenerated from the live catalog (`scripts/dump-supabase-schema.py`)
- [x] TD-009: missing FK indexes created on Main and Test
- [x] TD-010: `users.is_approved` / `members.monthly_pledge` NOT NULL, `users.role` CHECK (both projects)
- [x] Apply `20260929_harden_handle_new_user_role.sql` to the live database (**done — Main + Test**)
- [x] Apply `20260929_harden_definer_rpcs.sql` to Main and `migrations-test/20260929_harden_test_project.sql` to Test (**done**)
- [x] Apply `20260929_backfill_legacy_donations.sql` + the canonical summary view to Main (**done — zero-sum verified**)
- [ ] TD-011: converge Test's schema with Main, or retire Test; re-sync the migration ledger
- [ ] Roadmap: per-member monthly collection report (from `payment_allocations`)
- [ ] Roadmap: overdue pledge auto-reminder via WhatsApp
- [ ] Roadmap: receipt PDF export (currently JPEG only)

### Known debt (tracked in [docs/decisions/TECH_DEBT.md](docs/decisions/TECH_DEBT.md))
- TD-001 *(mitigated)* Founder email bypass — now centralized in `lib/auth.ts`
- TD-003 `get_my_role()` runs per RLS check
- TD-004 Receipt generation is canvas-heavy
- TD-007 *(mitigated)* Excel/PDF export overlap — `exceljs` dropped
- TD-011 *(open)* Two deployments with divergent schemas; migration ledger not in sync

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