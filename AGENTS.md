# AGENTS.md

Instructions for AI coding assistants (Claude Code, Cursor, GitHub Copilot, etc.) working in this repository.

## Role of This File

This repository has **two** AI-guidance files:

- **CLAUDE.md** — design rules, the ledger/khata visual identity. **Do not deviate** from those patterns.
- **AGENTS.md** (this file) — engineering rules: architecture, invariants, security, testing, documentation sync, commit discipline.

Both files were audited against the actual code and live database before being written.

## The Number One Rule

> **There is exactly ONE canonical payment-allocation algorithm in this codebase.**
> It exists in two (and only two) places, and they MUST agree:
> 1. `lib/payment-ledger.ts` (TypeScript — reference implementation)
> 2. `calculate_payment_allocation()` in Supabase (SQL)

Precedence (identical everywhere): latest applicable pledge-history entry → `member.monthly_pledge` → `0`, clamped ≥ 0.

**If you touch one, you MUST touch the other, and re-run `pnpm test:ledger`.** After any change to allocation or donation writes, verify:

```sql
SELECT SUM(amount) FROM payment_allocations;  -- must equal
SELECT SUM(amount) FROM donations;
```

See [docs/decisions/ADRs/ADR-001-canonical-payment-allocation.md](docs/decisions/ADRs/ADR-001-canonical-payment-allocation.md) and [ADR-002](docs/decisions/ADRs/ADR-002-payment-allocations-source-of-truth.md).

## Repository Topology

```
app/                    Next.js App Router pages + API routes
lib/                    Shared TS libraries (CANONICAL engine, supabase clients, utils, integrations)
components/             React components (AuthProvider, layout shell, shadcn/ui)
supabase/migrations/    SQL migrations (chronological, applied to live DB)
tests/                  Unit tests (node --experimental-strip-types --test)
docs/                   Documentation system (source of truth for design + engineering docs)
public/                 Static assets, Bengali fonts, PWA
```

## Read This First

Before modifying code, read these — they contain invariants and gotchas:

| File | Why |
|------|-----|
| `lib/payment-ledger.ts` | The canonical allocation engine — understand before touching any financial logic |
| `app/api/payments/route.ts` | The only place the service-role key is (correctly) used server-side |
| `docs/architecture/ACCOUNTING_DOMAIN.md` | Accounting domain model and rules |
| `docs/architecture/SECURITY.md` | Auth/RBAC/RLS model |
| `docs/architecture/SYSTEM.md` | Overall architecture and request flows |
| `CLAUDE.md` | Design system (do not deviate) |

## Golden Rules / Non-Negotiables

1. **No secrets on the client.** `NEXT_PUBLIC_` prefix is FORBIDDEN for anything more sensitive than the anon key. The service-role key lives ONLY in server code — never in components, never in the browser bundle.
2. **No `auth.role()` in RLS.** Use `get_my_role()` (a SQL function reading the `users` table) as the app's role source.
3. **No hacks to bypass TypeScript errors.** Do not add `@ts-ignore`, `as any` to dodge a type error. Fix the type, or (if truly blocked) surface to the user first.
4. **No `.env` / secrets commits.** Secrets stay in `.env.local` (gitignored).
5. **Do not modify or reset existing data** unless the user explicitly instructs it, and never without a backfill/integrity verification afterward.
6. **Preserve existing features and backward compatibility.** Do not silently change public behavior.
7. **One allocation algorithm** — already stated in the Number One Rule.
8. **No lazy commit messages.** Every commit must explain what changed and why. See "Commit Message Discipline" below.

## Document Sync Rules

The `docs/` tree is a **living document** that must reflect the code and live DB. When you change:

| Change made | Must also update |
|-------------|------------------|
| Accounting/allocation/ledger/summary logic | `docs/architecture/ACCOUNTING_DOMAIN.md`, `docs/architecture/DATA_FLOW.md`, memory `[[payment-ledger-canonical-engine]]` |
| New/edited migration | `docs/database/SCHEMA.md` + `docs/database/MIGRATIONS.md` (history table) |
| New/renamed route or page | `docs/product/FEATURE_MAP.md` |
| New ADR-worthy decision | new file in `docs/decisions/ADRs/`, update index |
| Roles / permissions | `docs/development/ROLES.md` |
| New bug found (before fixing) | `docs/decisions/BUGS.md` (BUG-###) with status `open` |
| Bug fixed | `docs/decisions/BUGS.md` status → `fixed`, CHANGELOG.md `[Unreleased]` |
| New trade-off accepted | `docs/decisions/TECH_DEBT.md` (TD-###) |
| Release notes worth noting | `CHANGELOG.md` at repo root |
| Code/behavior change (post-commit) | `COMMIT_LOG.md` at repo root (immediately after commit) |
| Product vision changes | `docs/product/VISION.md` |

## What to Update When (Quick Reference)

| Situation | Action |
|-----------|--------|
| **Found a bug** | Write `BUG-###` entry in `docs/decisions/BUGS.md` with status `open` *before* fixing |
| **Fixed a bug** | Change bug status to `fixed`, add line to CHANGELOG.md `[Unreleased] > ### Fixed`, commit both together |
| **Adding a feature** | Update `docs/product/FEATURE_MAP.md`, add to CHANGELOG.md `[Unreleased] > ### Added`, update `README.md` if new route |
| **Accepting a trade-off** | Write `TD-###` entry in `docs/decisions/TECH_DEBT.md` with status `open` |
| **Resolving tech debt** | Change TD status to `resolved` or `mitigated`, note in CHANGELOG.md |
| **Applying a migration** | Update `docs/database/SCHEMA.md` + `MIGRATIONS.md`, run `NOTIFY pgrst, 'reload schema'` |
| **Changing architecture / data flow** | Update `docs/architecture/SYSTEM.md` or `DATA_FLOW.md` as needed |
| **Changing roles / permissions** | Update `docs/development/ROLES.md` |
| **Writing an ADR** | Create `docs/decisions/ADRs/ADR-XXX-title.md`, update `docs/decisions/README.md` index |

## Commit Message Discipline

Every commit must tell a clear story: **what was done, why, and what changed.** Do not use lazy messages like "fix", "update", "chore", or "WIP". The commit log is the first thing any developer (including future you) reads to understand the project.

### Format

```
<type>(<scope>): <title>

<body>
- What changed (before vs after)
- Why this change was needed
- Any trade-offs or gotchas
- Link to related bug/ADR/TD if applicable
</body>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `revert`

**Scope:** the area touched — `payments`, `ledger`, `receipts`, `auth`, `migrations`, `dashboard`, `reports`, `admin`, `sheets`, `whatsapp`, `allocations`, `schema`

### Examples

```
fix(ledger): add monthly_pledge fallback to SQL allocation engine

- Before: calculate_payment_allocation() resolved pledges only from
  member_pledge_history JSONB. Members without a history entry fell
  through to NULL, causing donations to be marked "unallocated".
- After: COALESCE chain now falls back to member.monthly_pledge, then 0.
  Mirrors the TypeScript engine in lib/payment-ledger.ts.
- Impact: 37 of 40 donations were misallocated. Backfill run via
  backfill_payment_allocations().
- Invariant: SUM(payment_allocations) = SUM(donations) verified (7,442).
- Related: BUG-001, ADR-001
```

```
feat(payments): add live allocation preview in Joma Entry form

- Before: users submitted payments without seeing how the amount would
  split across months. Surprise allocations led to disputes.
- After: client calls calculatePaymentAllocation() in real-time as the
  user types. Preview table shows month → amount mapping before save.
- Trade-off: preview is client-side only; server re-runs on submit.
  If the TS and SQL engines diverge, the preview may differ from what
  the DB actually stores. This is why the single-algorithm rule exists.
- Test: added 2 test cases to tests/payment-ledger.test.ts for preview edge cases.
```

```
docs(schemas): update SCHEMA.md after payment_allocations migration

- Added payment_allocations table docs (columns, FKs, indexes)
- Documented calculate_payment_allocation() SQL function signature
- Added backfill_payment_allocations() to MIGRATIONS.md history table
- Notified PostgREST with NOTIFY pgrst, 'reload schema'
```

### Rules

1. **Never push a commit without a message.** If you can't write 2-3 lines about what changed, you're not ready to commit.
2. **Scope is required** when the change targets a specific module. No scope only for broad chores (e.g., `chore: bump deps`).
3. **Body is mandatory** for `feat`, `fix`, `refactor`, `revert`. Light chores can skip the body but must still be specific.
4. **Never use "update", "fix stuff", "WIP", "temp"** — these are unprofessional and unhelpful.
5. **Reference bugs and ADRs** in the body using `BUG-###` or `ADR-###` so future readers can trace the decision.
6. **One logical change per commit.** If you touched 3 unrelated things, split into 3 commits.

## Before You Commit / Push (Required Checklist)

Before marking a task done, verify **all** of the following that apply:

```
- [ ] Code change? → ran `pnpm test:ledger` (if allocation/financial logic touched)
- [ ] New bug found? → added entry to docs/decisions/BUGS.md (BUG-###) with status "open"
- [ ] Bug fixed? → changed BUG-### status to "fixed", added entry to CHANGELOG.md
- [ ] New trade-off? → added entry to docs/decisions/TECH_DEBT.md (TD-###)
- [ ] New feature / route? → updated docs/product/FEATURE_MAP.md
- [ ] Migration applied? → updated docs/database/SCHEMA.md + MIGRATIONS.md + NOTIFY pgrst
- [ ] New ADR-worthy decision? → wrote docs/decisions/ADRs/ADR-XXX-title.md
- [ ] Architectural change? → updated docs/architecture/SYSTEM.md or DATA_FLOW.md
- [ ] Roles changed? → updated docs/development/ROLES.md
- [ ] Zero-sum invariant verified? → SELECT SUM(amount) FROM payment_allocations equals donations
- [ ] CHANGELOG.md [Unreleased] block updated (if user-facing change)
- [ ] COMMIT_LOG.md entry written with before→after table (if code/behavior change)
- [ ] CLAUDE.md / README.md still accurate? (quick scan)
- [ ] Commit message follows discipline rules (type/scope/body, not "fix" or "WIP")
```

**Rule:** Never push to `dev` without completing this checklist. A commit with code but no doc update is an incomplete commit — fix the docs first, or create a follow-up issue in `docs/decisions/BUGS.md` as BUG-followup.

## Before You Consider a Task Done

- [ ] Read the applicable docs in `docs/` first (don't guess from code alone)
- [ ] If you changed allocation or any financial write: ran `pnpm test:ledger`, behavior matches SQL engine, zero-sum verified
- [ ] If you added a migration: `docs/database/` updated, `NOTIFY pgrst` present
- [ ] No secrets introduced; no `auth.role()`; no `@ts-ignore`
- [ ] Docs reflect reality (code and live DB are the source of truth)
- [ ] CHANGELOG.md [Unreleased] block contains the change (if user-facing)
- [ ] All checklist items above are resolved

## Code Style & Conventions

- **TypeScript strict.** Follow the surrounding style match the repo idiom (comment density, naming).
- **Bengali-first UX.** All user-facing text, numerals (`toBengaliNumber`), dates, and money (`formatMoney`) are Bengali. Don't introduce English labels in UI.
- **Client access** to Supabase uses the singleton in `lib/supabase-client.ts` (`getSupabase()`), with `createBrowserClient` in `lib/supabase/client.ts` noted as an overlapping alternative (TD-006 — prefer the singleton until consolidated).
- **Roles** resolved via `useAuth()` in `components/providers.tsx`.
- **Commit messages:** conventional commits with required body for non-trivial changes. See "Commit Message Discipline" above.

## Testing

```bash
pnpm test:ledger     # 28-case canonical allocation engine tests — REQUIRED after touching allocation
pnpm test:e2e        # Playwright (dashboard, reports)
pnpm lint            # ESLint — keep it clean (note: build has ignoreBuildErrors, see TD-002)
```

## Live Database Access

The live Supabase project is `pvfdgrdvvoytsfmjyvde` (Supabase MCP is configured). Schema/function changes go through the Supabase MCP `apply_migration`, and `NOTIFY pgrst, 'reload schema'` must be emitted. After any change that affects `payment_allocations` or `donations`, verify the zero-sum invariant and update `docs/database/SCHEMA.md`.
