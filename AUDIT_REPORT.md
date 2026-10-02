# Foundation App — Full Audit Report

**Repo:** TheSpideyBro/foundation-app (`main` branch, commit `0457297`)
**Audit date:** 1 October 2026
**Auditor:** Muse (subagent)
**App:** দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন — তহবিল ব্যবস্থাপনা PWA

---

## 1. Overview

Eta ekta Next.js 16 + React 19 + TypeScript + Supabase diye banano community fund-management PWA. Overall kotha bolte gele — codebase ta **surprisingly mature**. Repo-te 30 ta bug (BUG-001…030) already fix kore document kora ache, 11 ta tech-debt item track kora ache, CI te lint + type-check + unit test + Playwright E2E shob green. Eta kono half-baked side project na — ekhane real engineering discipline dekha jacche.

**Stack snapshot:**

| Jinish | Value |
|---|---|
| Framework | Next.js 16.2.12 (App Router), `output: "standalone"` |
| UI | React 19.2.4, Tailwind CSS v4, lucide-react |
| DB/Auth | Supabase (Postgres + GoTrue), `@supabase/ssr` |
| Language | TypeScript 5, `strict: true` |
| Package manager | pnpm (lockfile committed) |
| Testing | Playwright E2E + ledger unit tests + verify scripts |
| CI | GitHub Actions: lint → tsc → tests → build → E2E |
| PWA | manifest.json ache, kintu service worker **disabled** |
| i18n | Bangla-first UI, `<html lang="bn">`, Bengali fonts (Hind Siliguri, Tiro Bangla, Noto Serif Bengali) |

**Security posture (sarsongkhep):** Kono hardcoded secret paini. Shob API route-e `requireAuth()` gate ache. Shob table-e RLS enabled + 34 ta role-based policy. Service-role key shudhu server-side. `.env.local` commit hoyni. Payment input validation besh strong (amount, date, method allow-list, receipt_no sanitization). So **Critical severity-te kichu paini** — eta nijei ekta positive finding.

---

## 2. Issues Found

### 🔴 High

**H1 — `xlsx` (SheetJS) 0.18.5-te known unpatched vulnerability, ar eta diye user-uploaded file parse hoy**
- File: `app/admin/bulk/page.tsx:52` (`XLSX.read(bstr, { type: 'binary' })`), `app/reports/page.tsx` (export)
- SheetJS-er purono version-e documented prototype-pollution / ReDoS vulnerability ache, upstream-e ar fix hoyna (project ta effectively unmaintained).
- Bulk import-e admin-ra jekono `.xlsx` upload korte pare — malicious file diye parser exploit howa theoretically possible.
- Extra concern: import-e **kono row-count cap nai**, boro file browser-ke hang korate pare.

**H2 — Founder email bypass ekhono live (`lib/auth.ts`)**
- `FOUNDER_EMAIL` fallback (`saddamakash234@gmail.com`) — jodi DB-te role bhul thake, ei email diye login korlei admin power pawa jay, DB role bypass kore.
- Status "mitigated" (ekhon ek jaygay centralized), kintu bypass ta ekhono ache. Oi Gmail account compromise hole attacker direct admin.
- File: `lib/auth.ts:19-31` (TD-001)

### 🟡 Medium

**M1 — Content-Security-Policy header comment-out kora**
- File: `next.config.ts` — CSP line ta comment hishebe pore ache.
- Baki security header (nosniff, DENY frame, HSTS) ache, kintu CSP na thakay XSS hole blast radius boro.

**M2 — Receipt-er QR code dead link-e point kore**
- File: `app/api/receipts/[id]/route.ts` — QR data: `https://daulkharfoundation.vercel.app/verify/{receipt_no}`
- Kintu app-e **kono `/verify` route nai**. QR scan korle user 404 (ba login wall) pabe — receipt-er trust feature-tai bhanga.

**M3 — Bulk import API-te row cap + per-row validation nai**
- File: `app/api/admin/bulk/route.ts` (POST) — `items` array-r length check kore shudhu `> 0`, upper bound nai. Raw client JSON direct `insert(items)` hoy.
- RLS + DB constraint ache, kintu ekta bishal payload DB-ke DoS korte pare, ar malformed row DB error hoye 500 dibe.

**M4 — Service worker disabled, "PWA" offline-capable na**
- File: `public/sw.js` — shudhu cache clear kore, `fetch` pass-through. Offline support zero.
- `app/layout.tsx:81` SW register kore, kintu SW nijei no-op. Manifest installable, kintu PWA bolle user offline expect korte pare.

**M5 — Dui ta Supabase project, schema divergent (TD-011, open)**
- Main vs Test project-er schema identical na (legacy `members.user_id` shudhu Test-e).
- Migration kon project-e apply hoise track kora kothin — ekdin bhul project-e deploy howar risk.

**M6 — Unbounded queries (scale hole slow hobe)**
- `app/admin/audit/page.tsx:29` — audit_log-er **shob row** ekbare load.
- `app/api/admin/bulk/route.ts` (GET export) — `select("*")` full table, pagination nai.
- Ekhon row kom bole problem nai, kintu 10k+ donation hole page hang korbe.

**M7 — ESLint-e tinti important rule off**
- File: `eslint.config.mjs` — `@typescript-eslint/no-explicit-any`, `no-unused-vars`, `react-hooks/exhaustive-deps` off.
- Config-ei lekha ache "new code should still prefer explicit types" — kintu enforce hoyna, tai `any` aste aste chorabe.

### 🟢 Low

**L1 — `/api/sync-sheets` GET public**
- File: `app/api/sync-sheets/route.ts` — auth charai bole dey Google Sheets backup configured kina (boolean). Khoti kom, kintu info leak.

**L2 — RLS-te `get_my_role()` per-row call (TD-003, open)**
- Proti row evaluate-e `users` table query hoy. Ekhon scale-e thik ache; 10k+ row hole slow hobe.

**L3 — Receipt route-e ID existence oracle**
- File: `app/api/receipts/[id]/route.ts` — donation fetch hoy authorization check-er age. Logged-in non-staff user UUID guess kore bujhte parbe kon ID exist kore (404 vs 403). UUID unguessable bole practical risk kom.

**L4 — Icon-only button-e kichu jaygay `aria-label` nai**
- Jemon `app/admin/page.tsx:144,161` — sighted user-er jonno thik, screen reader-e ambiguous.

**L5 — Middleware env-missing hole auth gate skip kore**
- File: `middleware.ts` — env var na thakle shob route public hoye jay + mock client. Design-e intentional (build-time), kintu misconfigured deploy hole app shell public thakbe. Write fail-loud kore (bhalo dik).

---

## 3. Improvement Plan (Prioritized Roadmap)

### Phase 1 — Security hardening (ekhon-i kora uchit)
1. `xlsx` replace ba sandbox kora (H1) + bulk import-e row cap (M3)
2. CSP header enable kora (M1) — Supabase + Google Fonts allow-list diye
3. Founder bypass remove kora — age DB-te founder-er `role='admin'` verify kore, tarpor `isFounder()` tule fela (H2)

### Phase 2 — Broken UX thik kora
4. `/verify/[receipt_no]` public receipt-verification page banano (M2) — QR-tai tokhon kaj korbe
5. Service worker decision: hoy proper offline caching (dashboard shell + queue writes) implement, na hoy PWA claim komano (M4)

### Phase 3 — Scale + maintainability
6. Audit log + export-e pagination / cursor-based loading (M6)
7. RLS role lookup optimize (TD-003) — session claim ba per-query cache
8. Dui Supabase project-er schema unify + migration checklist (M5 / TD-011)
9. ESLint rule abar on kora, `any` gulo dhire dhire type kora (M7)

### Phase 4 — Nice to have
10. `/api/sync-sheets` GET-eo auth dewa (L1)
11. Icon-only button-e `aria-label` (L4)
12. Receipt route-e auth check age ana (L3)

---

## 4. Fix Plan (Concrete Steps, Ordered)

**Step 1 — Bulk import safe koro (H1 + M3)**
- `app/api/admin/bulk/route.ts` POST-e `items.length > 5000` hole 413 return koro.
- Per-row allow-list validation jog koro (shudhu expected column, type check) insert-er age.
- `app/admin/bulk/page.tsx:52`-te `XLSX.read`-er age file-size check (e.g. 5 MB) + try/catch-e parser error-ke friendly message-e rupantor koro.
- Long-term: `xlsx`-er bodole maintained parser (e.g. `exceljs`) evaluate koro.

**Step 2 — CSP enable koro (M1)**
- `next.config.ts`-e commented CSP uncomment koro, test koro:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co`
- Staging-e deploy kore browser console-e violation check koro.

**Step 3 — Founder bypass tule felo (H2)**
- Live DB-te check: `select role from users where email='saddamakash234@gmail.com'` → `'admin'` confirm koro.
- `lib/auth.ts` theke `isFounder` + `FOUNDER_EMAIL` remove koro, `isAdmin`/`isStaff` shudhu role-based rakho.
- `.env.example` theke `NEXT_PUBLIC_FOUNDER_EMAIL` doc remove koro.

**Step 4 — Receipt verify page (M2)**
- `app/verify/[receipt_no]/page.tsx` (public route, middleware-e public list-e jog) — receipt_no diye donation lookup (anon client + RLS `select_own`/public view), amount/month/status dekhabe.
- QR URL already `/verify/{receipt_no}` point kore — kono change lagbena receipt generator-e.

**Step 5 — SW decision (M4)**
- Option A: Workbox diye app-shell caching + `/dashboard` stale-while-revalidate.
- Option B: `public/sw.js` + registration tule fela, manifest-e `display: standalone` rakha (installable kintu offline claim na).

**Step 6 — Pagination (M6)**
- `app/admin/audit/page.tsx`-te `.range()` + "Load more" ba page-number UI.
- Bulk export GET-e `limit` param + streaming (ba CSV chunk).

**Step 7 — Schema unify (M5)**
- `supabase/schema.sql`-ke single source of truth dhoro, Test project-er extra `members.user_id` legacy column drop korar plan koro, migration log-e kon project-e ki apply hoise lekho.

**Step 8 — Lint strict koro (M7)**
- `no-explicit-any` → `warn`, proti PR-e notun `any` na asha monitor koro; `exhaustive-deps` → `warn`.

---

## Appendix — Ja thik ache (positive findings)

- Kono hardcoded secret nai; service-role key shudhu server-e (`NEXT_SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_` prefix chara).
- Shob 12 ta API route-e auth gate (`requireAuth` ba equivalent check) — verify kora hoise.
- 9 ta table-e RLS enabled, 34 ta policy, role-based + own-record access — design bhalo.
- Payment API-te strong validation: amount > 0, real-date check, future-date block, method allow-list, receipt_no sanitization, collector-ke staff verify (BUG-025 fix).
- Canonical allocation engine (TS = SQL = UI), zero-sum invariant enforced — fund-app-er jonno eitai shobcheye important guarantee.
- CI: lint + `tsc --noEmit` + ledger unit test + build + Playwright E2E — push-e shob run hoy.
- Docs besh bhalo: README, SETUP, ARCHITECTURE, SECURITY, 30 ta bug-er postmortem, tech-debt register.
- `.gitignore` thik ache — `.env.local`, MCP token file, local script commit hoyni.
- Bangla i18n jotnoshil: `lang="bn"`, Bengali font, amount-in-words Bangla-te, QR receipt Bangla-te.
