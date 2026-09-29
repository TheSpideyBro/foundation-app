# COMMIT_LOG.md — Detailed Commit History

**Purpose:** Every commit that touches code, schema, or config gets an entry here.  
**Format:** One section per commit, reverse chronological (newest first).  
**Use case:** Debug regressions — "when did this break?" → search this file by date/commit hash.

---

## How to Use

1. **After every commit** that changes behavior (not just docs), add an entry here.
2. Include: commit hash, date, author, scope, **what changed (before vs after)**, **why**, **tests run**, **known risks**.
3. If a bug appears later, `grep` this file for the affected area — find the commit that introduced it.
4. This is **not** a replacement for `git log` — it's a *semantic* log written by humans for humans.

---

## Entry Template

```markdown
## <commit-hash> — <type>(<scope>): <title>

**Date:** YYYY-MM-DD  
**Author:** <name>  
**Branch:** <branch>  
**Files changed:** <list key files>

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| <area> | <old behavior> | <new behavior> |

### Why

<Reason for the change — bug fix, feature, refactor, migration, etc.>

### Tests Run

- [ ] `pnpm test:ledger` — passed/failed (details)
- [ ] `pnpm test:e2e` — passed/failed (details)
- [ ] Manual verification: <what you checked>

### Related

- Bug: BUG-###
- ADR: ADR-###
- Tech Debt: TD-###
- Migration: <migration filename>

### Known Risks / Follow-ups

- <Anything that might regress, needs monitoring, or follow-up work>
```

---

## Commit History

---

## 201e602 — fix(ci): unblock the E2E job and let Playwright own the dev-server lifecycle

**Date:** 2026-09-30  
**Author:** AI Assistant (opencode)  
**Branch:** main  
**Files changed:** `.github/workflows/ci.yml`, `playwright.config.ts`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| CI status | every run since 2026-09-14 failed: first on `npm ci` with no `package-lock.json` (run 36603435061), then on `ERROR: .next/static not found` in the E2E job | run `36613578576`: **Lint ✓ Build ✓ E2E ✓** — first green run in the repo's history |
| E2E job | `prepare:standalone` before any `build`; the standalone server was never used (Playwright starts its own) | browser install → `playwright test` |
| `playwright.config.ts` webServer | `npm run dev -- --port 3001` (npm in a pnpm-only repo); the wrapper exited on teardown and orphaned `next dev`, so Playwright waited forever for the port | `exec ./node_modules/.bin/next dev --port 3001` — Playwright signals the server process directly |

### Why

The E2E job could never pass (dead `prepare:standalone` step), and after removing that
step the local reproduction showed the run hanging *after* all tests finished —
Playwright never got its port back because the `pnpm`/`npm` wrapper it signalled was
not the process holding port 3001.

### Tests Run

- [x] Local run with CI-equivalent env (`NEXT_PUBLIC_SUPABASE_URL=…placeholder…`): `3 passed, 6 skipped (17.3s)`, self-exit in ~40s, `ps` shows no leftover `next-server`
- [x] `pnpm exec tsc --noEmit`, `pnpm lint` — clean
- [x] GitHub Actions run `36613578576` — all three jobs green

### Related

- Follow-up to `5f7c86f` (which switched CI from `npm ci` to pnpm)

### Known Risks / Follow-ups

- The6 authenticated E2E tests skip in CI (no `TEST_EMAIL`/`TEST_PASSWORD` secrets). Adding them as repository secrets would give real coverage.
- Runner annotations warn that `actions/checkout@v4` / `setup-node@v4` / `pnpm/action-setup@v4` are Node-20-targeted actions; harmless today but worth refreshing to v5 when convenient.

---

## 5f7c86f — chore(repo): remove 35 dead files, 8 unused deps and fix the pnpm CI

**Date:** 2026-09-30  
**Author:** AI Assistant (opencode)  
**Branch:** main  
**Files changed:** 35 deleted (`components/ui/*`, `scripts/*` one-offs, `tests/*` one-offs, `public/*.svg` boilerplate, `HIGH_PRIORITY_FIXES.md`, `VERIFICATION_REPORT.md`, `docs/sheets/*.xlsx`, `lib/sheets-auto.ts`, `components.json`), `package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`, README/AGENTS/SYSTEM/CONTRIBUTING/FEATURE_MAP/CHANGELOG

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Dead source files | 15 unused shadcn components + `lib/sheets-auto.ts` + 6 one-off `scripts/` + 4 one-off `tests/` + 5 boilerplate SVGs + 2 stale root reports + an unreferenced xlsx — none referenced anywhere | 35 files removed; `components/` is just `providers.tsx` + `layout.tsx`, `scripts/` is `prepare-standalone.js` + `dump-supabase-schema.py`, `tests/` is `payment-ledger.test.ts` + `e2e/` + `verify-fixes.js` |
| Dependencies | `@base-ui/react`, `framer-motion`, `recharts`, `html-to-image`, `date-fns`, `class-variance-authority`, `tw-animate-css`, `shadcn` in the tree with **zero** importers; `playwright` shipped in `dependencies` | 8 packages dropped; `playwright` moved to `devDependencies` (lockfile −~250 lines) |
| CI | `.github/workflows/ci.yml` ran `npm ci` — impossible since `package-lock.json` was deleted; ledger tests not run in CI | pnpm + Node 22 in all 3 jobs, `pnpm test:ledger` added to the lint job |
| `package.json` scripts | `start` / `test:verify` shelled out to `npm run` | invoke `node scripts/prepare-standalone.js` directly |
| Docs | SYSTEM.md file tree still listed `lib/audit.ts`, `lib/supabase/client.ts`, `sheets-auto.ts`, `ui/ (15)`, "migrations (10)"; README/AGENTS/CONTRIBUTING/FEATURE_MAP mentioned shadcn | trees and mentions match the repo; CHANGELOG gained a `### Removed` section |

### Why

Verification sweep after the audit fixes: grep showed every deleted file had zero
importers/references, and every dropped dependency had zero imports anywhere in
`app/`, `lib/`, `components/`, `tests/`. The CI workflow was left broken by the
earlier removal of `package-lock.json`.

### Tests Run

- [x] `pnpm install` — clean, removes the 8 packages
- [x] `pnpm exec tsc --noEmit` — clean
- [x] `pnpm lint` — clean
- [x] `pnpm build` — exit 0
- [x] `pnpm test:ledger` — 28/28
- [x] Final repo-wide grep: no reference to any deleted filename (only historical docs: ADR-005, TECH_DEBT TD-007, SECURITY, `docs/audits/*`)

### Related

- Tech Debt: closes the "dead code" tail of the repository audit (TD-001…TD-011 are unaffected)
- Note: `reference/full-app-design.jsx` still imports `recharts` — it is a static design mock, never compiled (`.jsx` is outside tsconfig's include), and is kept because README/CLAUDE/CONTRIBUTING link to it

### Known Risks / Follow-ups

- Re-adding shadcn later is `pnpm dlx shadcn@latest init` + `add <component>` (user decision: leave it removed).
- CI now actually runs; the first push will exercise pnpm/Node 22 — watch the `Lint, Type Check & Unit Tests` job.
- Push required the `workflow` scope on the GitHub token (`gh auth refresh -h github.com -s workflow`).

---

## 7f712c1 — fix(db): harden RPCs and views, restore zero-sum backfill, add Test migrations

**Date:** 2026-09-29  
**Author:** AI Assistant (opencode)  
**Branch:** main  
**Files changed:** `supabase/migrations/20260929_harden_handle_new_user_role.sql`, `20260929_harden_definer_rpcs.sql`, `20260929_backfill_legacy_donations.sql`, `supabase/migrations-test/20260929_harden_test_project.sql`, `supabase/schema.sql`, `scripts/dump-supabase-schema.py`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Write RPC auth (BUG-015) | `save_payment_entry` / `reallocate_payment` / `backfill_payment_allocations` = `SECURITY DEFINER`, no internal auth check, `GRANT EXECUTE` to `anon` (+ `authenticated` on Main) | `service_role` only — `REVOKE` from `anon`/`authenticated`/`PUBLIC`, `GRANT EXECUTE` to `service_role` on Main and Test |
| View exposure (BUG-015) | all summary views granted `SELECT` to `anon`, including `audit_log_view` (member data + audit trail with no session) | `anon` has `SELECT` on **0** views on both projects |
| Signup (BUG-012) | `handle_new_user()` trusted metadata; self-registration could set `role='admin'` | hardcodes `role='member'`, `is_approved=false` — applied to Main **and** Test |
| Pledge change (BUG-016) | Joma's validated pledge change was dropped: Main's `save_payment_entry` never touched `members.monthly_pledge`; Test updated history but not the member row; its `reallocate_payment` dropped the coverage window | `members.monthly_pledge` + `member_pledge_history` updated in the same transaction; coverage months persisted |
| Receipt numbers (BUG-017) | no lock, `lpad(6)` truncated the sequence (`991783` → `R-9917`) → guaranteed UNIQUE collision | `pg_advisory_xact_lock`, pad only when needed |
| Member self-update (BUG-018) | `members_update_own` let a member change their own `monthly_pledge`, `status`, `join_date` | `trg_member_self_update` restricts self-service columns to `name`/`address`/`phone` |
| Zero-sum (BUG-019) | `SUM(donations)=7,850` vs `SUM(payment_allocations)=3,300`; `backfill_payment_allocations()` missing from the project | function restored, 14 legacy rows coverage-pinned, backfilled → **7,850 = 7,850**, `unbackfilled = 0` |
| Summary view (BUG-020) | live view still the pre-ADR-002 greedy definition (`20260907_…_from_allocations.sql` never applied) → two algorithms live at once | canonical allocation-based view applied; reported 2026-09 4,350 → 3,000, 2026-08 400 → 500 (user-visible) |
| Schema file | hand-written `supabase/schema.sql` drifted (missing `payment_allocations`, `extra_amount`, wrong policy, phantom `members.user_id`) | generated from the live catalog by `scripts/dump-supabase-schema.py` |
| Test project | unaudited, anon-readable views, unsigned write RPCs, no `monthly_pledge` update | hardened via `supabase/migrations-test/` (its RPC signatures differ — Main's files must not be replayed) |
| Constraints/indexes | `users.role` unvalidated, `is_approved`/`monthly_pledge` nullable, missing FK indexes | `CHECK` + `NOT NULL` + 14 (Main) / 7 (Test) indexes |

### Why

The Supabase audit found that the documented "hardening" migration had never been applied,
that the security-critical RPCs were callable without a session, that 14 donations had no
allocation rows, and that two incompatible versions of the summary view existed. These are
the DB findings BUG-015 → BUG-020 / DB-001 → DB-013.

### Tests Run

- [x] Post-application catalog queries on Main: zero-sum `7,850 = 7,850`, `unbackfilled = 0`, 0 anon-readable views, 0 anon-execute write RPCs, `handle_new_user` returns `member`/`false`
- [x] Same assertions on Test: zero-sum `7,442 = 7,442`, 0 anon-readable views
- [x] `supabase/schema.sql` regenerated and diffed against the catalog
- [x] `pnpm test:ledger` — 28/28 (run with a TS-capable Node 22; the distro `node` build lacks type stripping)

### Related

- Bug: BUG-012, BUG-015, BUG-016, BUG-017, BUG-018, BUG-019, BUG-020
- Tech Debt: TD-008 (resolved), TD-009 (resolved), TD-010 (resolved), TD-011 (open)
- Migrations: `20260929_harden_handle_new_user_role.sql`, `20260929_harden_definer_rpcs.sql`, `20260929_backfill_legacy_donations.sql`, `20260907_monthly_collection_summary_from_allocations.sql`, `migrations-test/20260929_harden_test_project.sql`

### Known Risks / Follow-ups

- **User-visible report numbers changed** (BUG-020): September collection now shows ৳3,000 instead of ৳4,350 — this is the correct, allocation-based figure; worth telling the team before month-end.
- Main and Test schemas have diverged (TD-011); the `supabase_migrations.schema_migrations` ledger on Main stops at `20260907194636`, so verify against the catalog, not the ledger.
- Any existing script or client calling `save_payment_entry`/`reallocate_payment` with the anon key will now get 42501 — the server must use the service-role key (it does, in `app/api/payments/route.ts`).

---

## 87ab2eb — fix(app): close auth, authorization, date and accounting-display bugs

**Date:** 2026-09-29  
**Author:** AI Assistant (opencode)  
**Branch:** main  
**Files changed:** `app/**`, `components/providers.tsx`, `components/layout.tsx`, `lib/auth.ts`, `lib/server-auth.ts`, `lib/utils.ts`, `lib/supabase-client.ts`, `next.config.ts`, `package.json`, `.env.example` (+ deleted `lib/audit.ts`, `lib/supabase/client.ts`, `package-lock.json`)

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| API auth (BUG-011) | hand-rolled cookie parser never matched, every staff API returned 401 | canonical `createClient()` from `lib/supabase/server.ts` |
| Route authorization (BUG-014) | `/api/notify/whatsapp` had no auth at all; `/admin/members/[id]` had no role gate; admin tiles visible to every role | `requireAuth("staff"\|"admin")` in `lib/server-auth.ts`, enforces `is_approved === true` |
| Role logic | 16 inlined founder-email literals across pages | one `FOUNDER_EMAIL` + `isStaff`/`isAdmin`/`isApproved` in `lib/auth.ts` |
| Approval check | `isApproved = is_approved !== false` — `null` counted as approved | `isApproved === true`, fails closed (safe now that the column is `NOT NULL`) |
| Dates (BUG-013) | UTC month/day defaults → Joma + admin pages defaulted to *yesterday* 00:00–06:00 | `todayISO`/`currentMonthStr`/`toLocalISODate` in `lib/utils.ts` |
| Sign-up payload | sent `role`/`is_approved` from the client | removed; `ensureProfile()` hardcodes `member`/`false` |
| Build hygiene | `ignoreBuildErrors: true`, unused `exceljs`, duplicate `package-lock.json` + browser client, silent mock writes | removed; mock throws `SUPABASE_NOT_CONFIGURED` |
| Dead code | `lib/audit.ts` (broken, no importers) | deleted — the audit trail is written by DB triggers |
| Dashboard | fabricated "অ্যাক্টিভিটি স্কোর ৯৪%", wrong `/api/sheets/sync` path, public pending-members link | real `stats.netBalance`, `/api/sync-sheets`, admin-only |

### Why

Repository audit found broken auth on every staff API, a publicly callable WhatsApp endpoint,
client-controlled role metadata, and UTC date drift. Together with the DB work these are
BUG-006 → BUG-014.

### Tests Run

- [x] `./node_modules/.bin/tsc --noEmit` — clean
- [x] `pnpm lint` — clean
- [x] `pnpm build` — exit 0 (no `ignoreBuildErrors`)
- [x] `pnpm test:ledger` — 28/28 (with a TS-capable Node 22)

### Related

- Bug: BUG-006, BUG-007, BUG-008, BUG-011, BUG-012, BUG-013, BUG-014
- Tech Debt: TD-002 (resolved), TD-005 (resolved), TD-006 (resolved), TD-007 (resolved)

### Known Risks / Follow-ups

- `requireAuth()` rejections are a behavior change: routes that previously answered `200` now return `401`/`403` — intentional, but any client relying on the old open routes will notice.
- Founder-bypass removal (TD-001) is still open: it is now centralized in `lib/auth.ts` but the live role row must be confirmed first.

---

## 2c59228 — docs(AGENTS): add commit message discipline section, fix duplicates

**Date:** 2026-09-07  
**Author:** AI Assistant (Claude Code)  
**Branch:** dev → main  
**Files changed:** `AGENTS.md`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Commit message rules | One line: "Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)." | Full "Commit Message Discipline" section with format, scope taxonomy, 3 real examples, 6 rules |
| Before-You-Commit checklist | 12 items | 13 items (added commit discipline check) |
| Golden Rules | 7 rules | 8 rules (added #8: "No lazy commit messages") |
| Code Style section | Referenced bare conventional commits | References "Commit Message Discipline" section |
| Duplicate sections | Two "Before You Consider a Task Done" sections | Single consolidated section |

### Why

User requested explicit commit message standards so every commit tells a clear story (what, why, what changed). Previous commits like "fix", "update", "WIP" were unhelpful for debugging.

### Tests Run

- [ ] `pnpm test:ledger` — N/A (docs only)
- [ ] `pnpm test:e2e` — N/A (docs only)
- [ ] Manual verification: Read AGENTS.md to confirm no duplicate sections, examples are accurate to project

### Related

- Tech Debt: TD-001 (hardcoded email bypass — commit discipline helps trace when it was added)
- Doc-sync rule: "Documentation reflects reality"

### Known Risks / Follow-ups

- None for docs-only change. Future commits must follow the new format.

---

## 1fcc43b — docs: redesign README with badges, feature table, and invariants

**Date:** 2026-09-07  
**Author:** AI Assistant (Claude Code)  
**Branch:** dev → main  
**Files changed:** `README.md`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Hero | Plain text title | Centered logo (icon-512.png), Bengali + English title |
| Tech badges | None | Next.js 16, Supabase, Tailwind v4, TypeScript 5 (for-the-badge style) |
| Status badges | None | CI, Issues, License |
| Feature overview | Bulleted list | "From → To" table (paper khata → digital Joma Entry, etc.) |
| Key guarantee | Inline sentence | Bold callout: single canonical algorithm + zero-sum invariant |
| Quick start | 3-line bash | 3-line bash + link to SETUP.md |
| Documentation index | Small table (12 links) | Full table (16 links) organized by category |
| Directory map | None | Tree view with descriptions |
| Scripts table | None | 6 commands with purposes |
| Invariants | None | 5 rules pulled from AGENTS.md |
| Branch info | None | main vs dev table |
| License | One line | One line + link |

### Why

User asked: "readme.md in github seems so short is it okay or you gonna add some more thing and make this looks more cool?" — wanted a professional GitHub landing page.

### Tests Run

- [ ] `pnpm test:ledger` — N/A
- [ ] `pnpm test:e2e` — N/A
- [ ] Manual verification: Rendered on GitHub — badges load, logo displays, tables readable

### Related

- Doc-sync Rule 5: "README.md is the entry point... If project structure changes, update README"

### Known Risks / Follow-ups

- CI badge points to `dev` branch workflow — if CI moves to another branch, update badge URL.
- No screenshots exist — logo is the only visual. Consider adding app screenshots later.

---

## 62d7e35 — docs: add doc-sync checklist, bug/feature lifecycle rules, and roadmap section to CHANGELOG

**Date:** 2026-09-07  
**Author:** AI Assistant (Claude Code)  
**Branch:** main (direct)  
**Files changed:** `AGENTS.md`, `CHANGELOG.md`, `CLAUDE.md`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| AGENTS.md doc-sync table | 8 rows | 10 rows (added bug found → BUGS.md with status `open`, product vision → VISION.md) |
| AGENTS.md "What to Update When" | Not present | New 9-row table mapping situations to actions |
| AGENTS.md Before-You-Commit | 12-item checklist | 13-item checklist (added zero-sum invariant, CHANGELOG, CLAUDE/README scan) |
| CHANGELOG.md `[Unreleased]` | Only "Known debt" list | Added "Planned / Next Up" with 10 checkbox items (7 TDs + 3 roadmap) |
| CLAUDE.md AI agent note | "Also read AGENTS.md for engineering invariants..." | "Also read AGENTS.md for engineering invariants... and the **mandatory doc-sync checklist** before committing" |

### Why

User asked: "did you add a rule in claude and agents.md to update everything after adding new features, bug finding and fixing, update changes, future vision or like incoming feature section for next update features etc etc"

### Tests Run

- [ ] `pnpm test:ledger` — N/A
- [ ] `pnpm test:e2e` — N/A
- [ ] Manual verification: All cross-links work (BUGS.md, TECH_DEBT.md, VISION.md, FEATURE_MAP.md)

### Related

- Doc-sync Rules 1-6 (all reinforced)
- BUGS.md, TECH_DEBT.md, VISION.md, FEATURE_MAP.md

### Known Risks / Follow-ups

- The "Planned / Next Up" section in CHANGELOG.md must be maintained manually — automation not yet added.
- TD items are duplicated between CHANGELOG.md and TECH_DEBT.md — keep in sync.

---

## 54206eb — docs: complete documentation system + cleanup (repo audit, docs/, AGENTS.md, CLAUDE.md, CHANGELOG.md, BUGS.md, TECH_DEBT.md, ADRs, audit fixes)

**Date:** 2026-09-07  
**Author:** AI Assistant (Claude Code)  
**Branch:** dev  
**Files changed:** 30+ files across `docs/`, root, `reference/`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Documentation | Scattered, outdated, missing | Complete `docs/` tree: product (VISION, FEATURE_MAP), architecture (SYSTEM, SECURITY, DATA_FLOW, ACCOUNTING_DOMAIN), database (SCHEMA, MIGRATIONS), development (CONTRIBUTING, ROLES, PROJECT_MANAGEMENT), decisions (BUGS, TECH_DEBT, ADRs/6), audits (REPOSITORY_AUDIT, FINAL_CONSISTENCY_AUDIT) |
| Root files | Minimal README, no AGENTS/CHANGELOG | README (v1), AGENTS.md, CLAUDE.md (updated), CHANGELOG.md, LICENSE |
| Reference designs | **Deleted** in commit bb47d30 | **Restored** from initial commit 32dd635: `reference/full-app-design.jsx`, `reference/receipt-design.jsx` |
| Debug artifacts | ~24 tracked files (HIGH_PRIORITY_FIXES.md, VERIFICATION_REPORT.md, *.log, *.tmp) | **Removed** from git tracking |
| Superseded setup docs | In root (SETUP.md, DEPLOYMENT.md, etc.) | Moved to `docs/development/`, linked from README |
| Audit findings | Open in REPOSITORY_AUDIT.md | Marked resolved in FINAL_CONSISTENCY_AUDIT.md |

### Why

User's original request: "Transform the current repository into a professional, self-documenting, audit-friendly software repository" with 38 specific sections. Also: "Do NOT immediately start creating documentation. First perform a complete repository audit."

### Tests Run

- [x] `pnpm test:ledger` — 28/28 passed (canonical allocation engine)
- [ ] `pnpm test:e2e` — Not run (time)
- [x] Manual: Verified zero-sum invariant `SUM(payment_allocations) = SUM(donations) = 7,442`
- [x] Manual: Confirmed reference design files restored and CLAUDE.md link valid

### Related

- BUG-001 (fixed in same session via migration 20260907_payment_allocations_member_pledge_fallback.sql)
- ADR-001 through ADR-006 (created)
- Migration 20260907_payment_allocations_member_pledge_fallback.sql

### Known Risks / Follow-ups

- TD-001 through TD-007 remain open (documented, not fixed)
- Google Sheets / WhatsApp setup guides created but not validated end-to-end
- SETUP.md still in root (should move to docs/development/ eventually)

---

## 8c04f12 — feat(payments): add extra_amount column + fix receipt generation, add repair migration

**Date:** 2026-09-08 (pushed to remote dev)  
**Author:** Unknown (pushed before this session)  
**Branch:** dev  
**Files changed:** `app/api/payments/route.ts`, `app/api/receipts/[id]/route.ts`, `app/donations/page.tsx`, `app/payments/page.tsx`, `app/reports/page.tsx`, `package.json`, 2 new migrations

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Donations table | No `extra_amount` column | Added `extra_amount` numeric column (Migration 20260908_extra_amount_and_receipt.sql) |
| Payment allocation | No handling for extra amount | Extra amount tracked separately from monthly allocations |
| Receipt generation | Basic amount display | Shows extra amount separately on receipt |
| Joma Entry form | No extra amount field | Added extra amount input with live preview |
| Reports | No extra amount column | Extra amount shown in donation reports |
| Payment repair | N/A | Migration 20260908_repair_payment_allocations_and_extra_amount.sql backfills/corrects |

### Why

Need to track amounts paid beyond the monthly pledge (extra cash) separately from pledge/advance allocations. Receipts must show this breakdown.

### Tests Run

- [ ] `pnpm test:ledger` — Unknown (pushed externally)
- [ ] `pnpm test:e2e` — Unknown
- [ ] Manual: Unknown

### Related

- New migrations: `20260908_extra_amount_and_receipt.sql`, `20260908_repair_payment_allocations_and_extra_amount.sql`
- BUGS.md / TECH_DEBT.md — not updated for this change (gap)

### Known Risks / Follow-ups

- **Critical:** This commit was pushed to remote dev *before* this session. The local dev branch had to merge it. Ensure:
  - `docs/database/SCHEMA.md` updated for `extra_amount` column
  - `docs/database/MIGRATIONS.md` updated with both new migrations
  - `docs/architecture/ACCOUNTING_DOMAIN.md` updated for extra-amount handling
  - `docs/architecture/DATA_FLOW.md` updated if allocation flow changed
  - `CHANGELOG.md` [Unreleased] should have entries for this feature
  - `docs/decisions/BUGS.md` / `TECH_DEBT.md` checked for related items
- Allocation engine (TS + SQL) must handle `extra_amount` correctly — verify parity.

---

## bb47d30 — chore(sheets): Google Sheets sync refactor (ACCIDENTALLY DELETED reference designs)

**Date:** 2026-09-06 (approx)  
**Author:** Unknown  
**Branch:** main/dev  
**Files changed:** Many — **deleted** `reference/full-app-design.jsx`, `reference/receipt-design.jsx`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Reference designs | Existed in `/reference` | **Deleted** — CLAUDE.md still pointed to them |
| Google Sheets sync | Previous implementation | Refactored (details in commit) |

### Why

Google Sheets integration work. The reference design deletion was accidental collateral damage.

### Tests Run

- Unknown

### Related

- **Restored** in commit 54206eb from initial commit 32dd635
- CLAUDE.md line 4: "Reference files are in /reference — always check them before building or modifying any UI."

### Known Risks / Follow-ups

- **Fixed:** Reference files restored. CLAUDE.md instruction now valid again.
- Verify no other reference files were lost.

---

## 32dd635 — Initial commit (foundation)

**Date:** 2026-08-16  
**Author:** TheSpideyBro  
**Branch:** main  
**Files changed:** Full initial codebase

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Project | Empty | Next.js 16 + Supabase + Tailwind v4 + TypeScript |
| Core features | None | Auth, Members, Donations, Expenses, Payments, Receipts, Reports, Dashboard, Admin, Sheets, WhatsApp, PWA |
| Database | Empty | 9 tables, 4 views, RPC functions |
| Design system | None | Ledger/khata identity (ink, paper, gold, Bengali fonts) |

### Why

Project inception.

### Tests Run

- Initial development testing

### Related

- All subsequent work builds on this foundation.

### Known Risks / Follow-ups

- Many early commits were iterative design/tooling — history is noisy.
- Documentation system added much later (commit 54206eb).

---

## 🔍 How to Search This File

| Question | Search for |
|----------|------------|
| "When did receipt generation break?" | `receipts`, `receipt` |
| "When was extra_amount added?" | `extra_amount` |
| "Which commit fixed BUG-001?" | `BUG-001` |
| "What migrations affect allocations?" | `payment_allocations`, `migration` |
| "When did the admin bypass get added?" | `saddamakash234`, `admin bypass`, `TD-001` |
| "What changed in Joma Entry?" | `Joma`, `payments`, `allocation preview` |

---

## Maintenance Rules

1. **Add entry immediately after commit** — don't batch.
2. **One entry per logical commit** — if you squash, write one combined entry.
3. **Be specific in "Before → After" table** — vague entries are useless for debugging.
4. **Always fill "Known Risks"** — even if "None known".
5. **Link to BUG/ADR/TD** — enables traceability.
6. **This file lives in repo root** — not in `docs/`, so it's visible immediately on GitHub.

---

## Automation Idea (Future)

A git hook (PostToolUse on `git commit`) could prompt for a COMMIT_LOG.md entry template. See `.claude/settings.json` for hook configuration.