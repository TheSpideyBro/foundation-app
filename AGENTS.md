# AGENTS.md

Instructions for AI coding assistants (Claude Code, Cursor, GitHub Copilot, etc.) working in this repository.

## Role of This File

This repository has **two** AI-guidance files:

- **CLAUDE.md** — design rules, the ledger/khata visual identity. **Do not deviate** from those patterns.
- **AGENTS.md** (this file) — engineering rules: architecture, invariants, security, testing, documentation sync.

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

1. **No secrets on the client.** `NEXT_PUBLIC_` prefix is FORBIDDEN for anything more sensitive than the anon key. The service-role key (`SUPABASE_SERVICE_ROLE_KEY` / `NEXT_SUPABASE_SERVICE_ROLE_KEY`) lives ONLY in server code — never in components, never in the browser bundle.
2. **No `auth.role()` in RLS.** Use `get_my_role()` (a SQL function reading the `users` table) as the app's role source.
3. **No hacks to bypass TypeScript errors.** Do not add `@ts-ignore`, `as any` to dodge a type error. Fix the type, or (if truly blocked) surface to the user first.
4. **No `.env` / secrets commits.** Secrets stay in `.env.local` (gitignored).
5. **Do not modify or reset existing data** unless the user explicitly instructs it, and never without a backfill/integrity verification afterward.
6. **Preserve existing features and backward compatibility.** Do not silently change public behavior.
7. **One allocation algorithm** — already stated in the Number One Rule.

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
- [ ] CLAUDE.md / README.md still accurate? (quick scan)
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

- **TypeScript strict.** Follow the surrounding style match the repo idiom (comment density, naming).
- **Bengali-first UX.** All user-facing text, numerals (`toBengaliNumber`), dates, and money (`formatMoney`) are Bengali. Don't introduce English labels in UI.
- **Client access** to Supabase uses the singleton in `lib/supabase-client.ts` (`getSupabase()`), with `createBrowserClient` in `lib/supabase/client.ts` noted as an overlapping alternative (TD-006 — prefer the singleton until consolidated).
- **Roles** resolved via `useAuth()` in `components/providers.tsx`.
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`).

## Testing

```bash
pnpm test:ledger     # 28-case canonical allocation engine tests — REQUIRED after touching allocation
pnpm test:e2e        # Playwright (dashboard, reports)
pnpm lint            # ESLint — keep it clean (note: build has ignoreBuildErrors, see TD-002)
```

## Live Database Access

The live Supabase project is `pvfdgrdvvoytsfmjyvde` (Supabase MCP is configured). Schema/function changes go through the Supabase MCP `apply_migration`, and `NOTIFY pgrst, 'reload schema'` must be emitted. After any change that affects `payment_allocations` or `donations`, verify the zero-sum invariant and update `docs/database/SCHEMA.md`.

## Before You Consider a Task Done

- [ ] Read the applicable docs in `docs/` first (don't guess from code alone)
- [ ] If you changed allocation or any financial write: ran `pnpm test:ledger`, behavior matches SQL engine, zero-sum verified
- [ ] If you added a migration: `docs/database/` updated, `NOTIFY pgrst` present
- [ ] No secrets introduced; no `auth.role()`; no `@ts-ignore`
- [ ] Docs reflect reality (code and live DB are the source of truth)