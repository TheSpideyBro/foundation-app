# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/), and the project adheres to semantic versioning where relevant.

## 📅 Date line-up

- First commit: **2026-08-16**
- Latest: **2026-09-29**

---

## [Unreleased]

### Added
- **Joma Entry auto-splits the cash handed over** — the জমা field is now the *total* (মোট নগদ): whatever the coverage window cannot absorb is derived as অতিরিক্ত জমা (read-only box, never typed) and sent as `extra_amount`, so `amount` = what the engine may allocate, `donations.amount` still equals the cash handed over and the zero-sum invariant is untouched. Before, the operator had to compute and type the split by hand — a ৳1,400 entry over a ৳1,300 window left ৳100 as an anonymous "অবণ্টিত" row with `extra_amount = 0`. Preview, confirm dialog, success screen and receipt now show the same three numbers (মোট নগদ / বরাদ্দ / অতিরিক্ত জমা), the amber "⚠ অবণ্টিত" warning became a normal extra-amount line, and the receipt/donation labels are Bengali instead of "Extra Amount"/"extra".
- `scripts/dump-supabase-schema.py`: regenerates `supabase/schema.sql` as executable DDL from the live catalog (tables, constraints, FKs, indexes, RLS, verbatim policies/functions with their EXECUTE grants, triggers, views, grants) — the hand-written file had drifted badly (TD-008).
- `supabase/migrations-test/`: separate migration folder for the Test project — its `save_payment_entry`/`reallocate_payment` signatures differ from Main, so replaying Main's files there would create broken overloads (TD-011).
- **Receipt verification (public)**: new `/verify/[receipt_no]` page — the QR code printed on every receipt now resolves to a branded "যাচাইকৃত রসিদ" check (masked donor name, amount in Bengali digits + words, month, date, collector); unknown numbers get a branded "রসিদ পাওয়া যায়নি" card. Whitelisted in `middleware.ts`.
- **HTML receipt view**: new staff-gated `/donations/[id]/receipt` page — accessible alternative to the JPEG receipt (screen-reader readable, copyable text) with a print button and scoped `@media print` stylesheet.
- **Bulk import UX**: per-section template download, file validation (5 MB cap, extension/MIME), parse preview (Bengali row count + first-5-rows table) with a "নিশ্চিত করুন" confirm step before POST, 500-row cap, per-row `{row, error}` reporting, progress text with `role="status"`.
- **Auth UX**: login honors `?callbackUrl=` (same-origin validated); password visibility toggles on all three password fields; signup uses inline Bengali banners (no more `alert()`), maps Supabase errors to Bengali, validates phone `^01[3-9]\d{8}$`, shows the 6-char password hint; `inputMode="tel"` on phone inputs.
- **App shell a11y**: mobile drawer with Escape-to-close, focus trap, `role="dialog"`/`aria-modal`; `aria-current="page"` on nav; branded Bengali `not-found.tsx` + `error.tsx` (retry); safe-area padding; 44px touch targets; role-aware bottom nav (staff see "জমা"); shared `AdminBackLink` component.
- **Bengali-first sweep**: reports/donations/expenses/members/member-detail labels, dates (`formatDateBengali`), numerals (`toBengaliNumber`/`formatMoney`), and methods (`methodLabels`) — no more "Cash Received"/"Search..."/raw ISO dates.
- List pages (donations, expenses, members) show skeleton rows while loading instead of bare spinners.

### Changed
- **Premium receipt redesign**: the staff HTML receipt (`/donations/[id]/receipt`) is rebuilt as an editorial "paper" receipt — ivory paper on a dark stage, emerald (`#022C22`/`#064E3B`) + gold (`#C9A227`) brand bands, Landmark masthead, large Bengali amount hero with কথায় amount, receipt-no/date band, donor/month/method/collector rows, gratitude + signature/seal areas, and a QR verification card. The QR is now a same-origin PNG from the new `GET /api/qr?text=...` endpoint (input capped at 512 chars, text only encoded — never fetched, no SSRF surface). Print CSS hides the toolbar, drops the stage background, and keeps exact colors. All data behavior (batch consolidation, staff gate, loading/error states) is unchanged; the presentational markup lives in `app/donations/[id]/receipt/ReceiptPaper.tsx`. Feedback round: headings/amount now use **Baloo Da 2** and the gratitude line uses **Galada** (new `--font-baloo`/`--font-galada` theme tokens); the "দান রসিদ" eyebrow's over-wide letter-spacing is fixed; the raw verify URL beside the QR is removed; the paper is tightened (smaller masthead, 42–50px amount hero, 88px QR, reduced paddings) to fit with minimal scrolling. Letterhead contacts: foundation address (দৌলখাঁড় পূর্বপাড়া, নাঙ্গলকোট, কুমিল্লা) and phone numbers (০১৮৪০-৮২৮০১০ · ০১৮১৪-৯৪৮২২৪) taken from the legacy JPEG receipt now appear under the masthead with MapPin/Phone icons. Details rows (প্রদানকারী, মাসের নাম, etc.) now use **Anek Bangla** (new `--font-anek` token) for a more stylish data look.

### Removed
- **34 dead files**: unreferenced one-off tooling (`scripts/capture-*.cjs`, `fix-env-google.js`, `live-fullsync.js`, `receipt_generator.py`, `verify-member-actions.cjs`), superseded smoke tests (`tests/e2e-full.js`, `live-sheets-test.js`, `validate-full-schema.js`, `verify-clean.js`), Next.js boilerplate SVGs (`public/next.svg`, `vercel.svg`, `window.svg`, `globe.svg`, `file.svg`), root-level work reports (`HIGH_PRIORITY_FIXES.md`, `VERIFICATION_REPORT.md` — superseded by CHANGELOG/COMMIT_LOG), the unused Google Sheet sample (`docs/sheets/*.xlsx`), and `lib/sheets-auto.ts` (no importers).
- **`components/ui/*` (15 shadcn components) + `components.json`** — nothing imported them; the UI is plain React + Tailwind + lucide-react.
- **8 unused dependencies**: `@base-ui/react`, `framer-motion`, `recharts`, `html-to-image`, `date-fns`, `class-variance-authority`, `tw-animate-css`, `shadcn`; `playwright` moved from `dependencies` to `devDependencies`.
- **CI fixed**: `.github/workflows/ci.yml` ran `npm ci`, which can no longer work since `package-lock.json` was dropped — now pnpm on Node 22, and it runs `pnpm test:ledger`.

### Security
- **BUG-025**: `POST /api/payments`/`PUT` accepted any string as `method` (no CHECK on `donations.method`), any existing `users` row as `collected_by` (a member could be recorded as the collector — the RPC runs as `service_role`, so RLS never saw it), and a malformed or future `date`. Now: `cash|bkash|nagad|bank` whitelist, collector must be an approved `admin`/`treasurer` (or the founder), real `YYYY-MM-DD` date ≤ server-today + 1 day, `receipt_no` length/whitespace.
- **BUG-026**: `error.message` from Postgres was returned to the browser (constraint/column names and SQL fragments). Both handlers now return `{ code, error }` with Bengali text via an `SQL_ERRORS` map; unknown messages are logged server-side only.
- **BUG-015**: `save_payment_entry()` / `reallocate_payment()` / `backfill_payment_allocations()` are `SECURITY DEFINER` with no internal auth check and were executable by `anon` (and `authenticated` on Main); all summary views — including `audit_log_view` on Test — granted `SELECT` to `anon`, exposing member/pledge data and the audit trail with no session. Write RPCs are now `service_role`-only and `anon` has no view access, on **both** Supabase projects (Main `mlnzxhuozuyidpxepxex`, Test `pvfdgrdvvoytsfmjyvde`).
- **BUG-017**: `generate_receipt_no()` had no lock and `lpad()` truncated the sequence (`991783` → `R-9917`), guaranteeing a UNIQUE collision. Now takes `pg_advisory_xact_lock` and pads only when needed (both projects).
- **BUG-018**: `members_update_own` let a member rewrite their own `monthly_pledge`, `status` or `join_date`. New `trg_member_self_update` trigger restricts self-service updates to name/address/phone (both projects).
- **BUG-016**: the Joma pledge change was validated by the API and then dropped by `save_payment_entry()` on Main; on Test the history row was written but `members.monthly_pledge` was never updated, and `reallocate_payment()` didn't store the new coverage window. All fixed.
- **BUG-012**: Sign-up metadata set `role`/`is_approved` and the `handle_new_user()` trigger trusted it — self-registered admins were possible. Migration `supabase/migrations/20260929_harden_handle_new_user_role.sql` hardcodes `member`/`false` (**applied to Main and Test**); signup no longer sends the fields; `ensureProfile()` hardcodes them too.
- **BUG-014**: `POST /api/notify/whatsapp` had no auth at all; `/admin/members/[id]` had no role gate; admin tiles were visible to every role. Every API route now goes through `requireAuth("staff"|"admin")` (`lib/server-auth.ts`), which also enforces `is_approved === true`.
- New `lib/auth.ts`: single `FOUNDER_EMAIL` constant + `isStaff`/`isAdmin`/`isApproved` — the 16 inlined founder-email literals are gone. `isApproved()` now fails closed (`=== true`), which the new `NOT NULL` constraint makes safe.
- `lib/supabase-client.ts`: mock client now throws `SUPABASE_NOT_CONFIGURED` on writes instead of silently no-oping.
- **BUG-034**: founder email bypass removed — `FOUNDER_EMAIL`/`isFounder()` deleted from `lib/auth.ts`; `isAdmin()`/`isStaff()` are purely `users.role`-based. ⚠️ Deploy only after confirming the founder's `users.role = 'admin'` in the live DB (TD-001 → resolved).
- **BUG-033**: `xlsx@0.18.5` (unmaintained, known prototype-pollution/ReDoS) replaced with `@e965/xlsx@0.20.3` drop-in (patched CVEs); bulk import additionally gets strict file validation (5 MB, extension/MIME) and a 500-row cap enforced client + server (413).
- **BUG-035**: Content-Security-Policy enabled in `next.config.ts` (adapted to Next.js + Tailwind v4 + Google Fonts + Supabase); `X-Frame-Options: DENY` → `SAMEORIGIN` so the same-origin receipt preview iframe works; deprecated `X-XSS-Protection` dropped.
- **BUG-039**: bulk import API validates every row against a per-table column allow-list + type checks before insert (fail-closed: nothing inserts if any row errors); export endpoint paginated (`limit`/`offset`).
- **BUG-040**: `GET /api/sync-sheets` (revealed Sheets-backup status with no auth) now requires `requireAuth("admin")`.
- **BUG-041**: middleware no longer skips the auth gate when Supabase env vars are missing — fails closed (protected routes redirect to `/login`).

### Fixed
- **BUG-031 (data)**: সাদ্দাম হোসেন আকাশ's ledger charged ৳1,000/month from September onward while every label said ৳100 — his ৳100 change had been saved with `effective_from_month = 2026-08`, so it only covered August. Confirmed with the operator: **September stays ৳1,000, October onward is ৳100** → migration `supabase/migrations/20261001_pledge_history_akash_october.sql` adds the missing `2026-10 → ৳100` row (idempotent, asserts both resolved months and `members.monthly_pledge`). No existing history row, donation or allocation changed; zero-sum still `7,850 = 7,850`.
- **BUG-031**: every "current pledge" label (Joma card "বর্তমান মাসিক অঙ্গীকার", "বর্তমান চাঁদা", the pledge-change arrow, `1x/2x/3x চাঁদা`, member detail header, members list card, Reports "মাসিক pledge" column) printed the raw `members.monthly_pledge`, which is only the *fallback* — a later-effective history row wins, so a member could show ৳100 while the preview beside it allocated at ৳1,000/month. All of them now resolve through `resolvePledgeForMonth()`; the engine's fallback argument is unchanged (the SQL twin reads the same field).
- **BUG-021**: `save_payment_entry()`/`reallocate_payment()` applied the Joma pledge change *after* reading the history and writing allocations, so a same-entry pledge change never priced that entry's own months (preview and DB agreed — both wrong). The pledge block now runs **first** in both functions, Main and Test (`20260930_pledge_change_before_allocation.sql`). Live verification, rolled back: pledge 100 → 150 effective `2026-09`, ৳150 payment → allocated 150 (was 100). Zero-sum intact: Main `7,850 = 7,850`, Test `7,442 = 7,442`.
- **BUG-022**: a coverage window of 122+ months made the TS preview (truncated at 121 by `monthRange()`) disagree with the SQL engine (uncapped `generate_series`). The same 120-month limit is now enforced in the API, in the Joma confirm dialog and in SQL.
- **BUG-023**: `pledge_effective_month` was unvalidated — a past month silently restated settled history, and anything but `YYYY-MM` corrupted `resolvePledgeForMonth()` string comparisons. Now format-checked and bounded to `>= coverage start` in both the API and SQL.
- **BUG-024**: the Reports cash fallback summed `donations.amount` **and** `extra_amount`, double-counting the extra (the invariant is `amount` already includes it) whenever `monthly_collection_summary` returned no rows.
- **BUG-027**: Joma Entry evaluated the staff gate before auth had resolved, flashing "প্রবেশাধিকার সংরক্ষিত" at staff — the spinner gate now renders first.
- **BUG-028**: Joma success screen kept the previous member's name in the search box, showed three different numbers under the same "অবণ্টিত" label, labelled the extra amount in English ("Extra Amount") and printed `৳{row.expected}` without `money()`. One label, one number now; the preview gained অতিরিক্ত জমা / মোট নগদ rows.
- **BUG-029**: the collector select was seeded with `user.id` even when that id was not in the loaded admin/treasurer list, saving a collector the operator never saw.
- **BUG-030**: submit had no abort/timeout (button stuck on "সংরক্ষণ হচ্ছে..." forever), dead `formatMonth` import, "ফিরে যান" navigated to `/donations` instead of back, and the member dropdown mixed inactive members into the active list.
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
- **BUG-032**: receipt QR codes pointed at `/verify/{receipt_no}`, a route that didn't exist — every printed receipt's QR landed on a 404. New public `/verify/[receipt_no]` page restores the trust feature; QR payload is now env-driven (`NEXT_PUBLIC_SITE_URL`, request-origin fallback) with a "স্ক্যান করে যাচাই করুন" caption.
- **BUG-036**: `X-Frame-Options: DENY` blocked the same-origin receipt preview iframe on `/donations` (blank preview) — now `SAMEORIGIN`.
- **BUG-037**: login ignored `?callbackUrl=` and always landed on `/dashboard` — now honors it after a same-origin check.
- **BUG-038**: expenses used native `alert()` for all errors and accepted negative amounts — now inline Bengali banners, `amount <= 0` rejected (matches DB `CHECK`), `min="0.01"` + `inputMode="decimal"`; dead `proof_url` state removed.
- **BUG-042**: audit log page loaded the entire `audit_log` table — now paginated (50/page, "আরো দেখুন").
- **Joma form**: real `<form>` (Enter submits), `inputMode="decimal"` on amounts, combobox a11y (`role=listbox/option`, empty-state message), disabled-save hints, confirm dialog with Escape + focus trap, extra-only validation, "চালু"/"বন্ধ" toggle, shared `formatMoney`, button hierarchy via design-system classes.
- **Signup**: inline banners instead of `alert()`, Bengali error mapping (raw English `error.message` never shown), phone regex + 6-char hint.
- **Mobile shell**: drawer a11y (Escape, focus trap, `role="dialog"`), `aria-current="page"`, safe-area `pb-[env(safe-area-inset-bottom)]`, 44px touch targets, branded Bengali 404 + error pages, manifest colors aligned (`#059669`/`#FDFDFC`), dead `--font-inter` token removed, dead footer `href="#"` links unwrapped (no number invented).
- **Labels**: orphan `/admin/members/[id]` linked from the members list ("বিস্তারিত দেখুন"); donations share fallback now shares the public verify link instead of a 401-ing API URL; "Workflow / /joma only" dev card replaced with "এই মাসের জমা"; icon buttons across the app gained Bengali `aria-label`s; ad-hoc buttons migrated to `.btn-emerald`/`.btn-outline`.
- **Lint**: `@typescript-eslint/no-explicit-any`, `no-unused-vars`, `react-hooks/exhaustive-deps` tightened from `off` to `warn` (0 errors; new `any`s now surface).

### Planned / Next Up

These are the items currently queued for the next release. Add new items here as they come up.

- [x] TD-001: Founder email bypass REMOVED in `fix(auth)!` (2026-10-01, `lib/auth.ts` — no more `FOUNDER_EMAIL`/`isFounder()`). ⚠️ Before deploy, confirm the founder's `users.role = 'admin'` in the live DB or they will be locked out of admin.
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
- TD-001 *(resolved 2026-10-01)* Founder email bypass — removed from `lib/auth.ts`; roles are the single source of truth
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