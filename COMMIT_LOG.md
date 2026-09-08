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