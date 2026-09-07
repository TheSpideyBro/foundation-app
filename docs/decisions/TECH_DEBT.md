# Technical Debt

Every trade-off that will bite later is logged here. Format: `TD-###`.

**Status values:** `open` | `in-progress` | `resolved` | `mitigated`

---

## TD-001: Hardcoded Founder Email as Admin Bypass

**Status:** open
**Region:** frontend

### Description

`components/layout.tsx`, `app/admin/page.tsx`, `app/admin/members/[id]/page.tsx` check `user?.email === 'saddamakash234@gmail.com'` directly, in addition to `role === 'admin'`. This is a global superuser bypass that:
- Cannot be revoked from the database (editing the email breaks it, but any *other* email can't be granted without code).
- Bypasses the `users.role` model and RLS semantics.
- Is a footgun if the account is ever compromised.

### Why it exists
The founder's mail account predates role modeling and the hardcoded check was the fastest reliable fix; role resolution had gaps at the time (BUG-005).

### Recommended action
- Ensure the founder's `users.role` is `admin` in the live DB.
- Add ALL the places that need admin access to the `users` table role instead.
- Once verified, remove the email literal and rely exclusively on `role`.
- Prefer a centralized `isAdmin`/`canAccess(role, required)` helper (existing pattern in `components/providers.tsx`) so no component ever inlines an email.

---

## TD-002: `ignoreBuildErrors: true` in next.config.ts

**Status:** open
**Region:** build

### Description

`next.config.ts` sets `ignoreBuildErrors: true` to pass type errors during build. This masks real regressions from CI and the build pipeline. `42370aa` introduced it to unblock a Vercel deployment.

### Why it exists
Deployment urgency; occasional legacy type issues that a clean-up pass has not completed.

### Recommended action
- Run `pnpm lint` and `npx tsc --noEmit` locally until zero errors.
- Flip `ignoreBuildErrors` off and keep it off (enforce in review).

---

## TD-003: `get_my_role()` Runs Per RLS Check

**Status:** open
**Region:** database

### Description

RLS policies invoke `get_my_role()` which queries the `users` table on every row evaluation. In tables with many rows (donations, payment_allocations) this adds a per-row function call overhead. Acceptable at current scale (hundreds of rows), not at tens of thousands.

### Recommended action
- Monitor table sizes.
- If needed, add a `role` field on the auth session claims or cache `get_my_role()` result per query (`SET LOCAL` + temp table) — must keep policy semantics identical.

---

## TD-004: Receipt Generation is Canvas-Heavy

**Status:** open
**Region:** backend

### Description

The receipt route allocates a 800×1200 canvas per request and regenerates the entire image each time. Webhook-scale concurrency (many simultaneous `?download=1` requests) could exhaust memory in a serverless container.

### Recommended action
- Cache generated receipts keyed by donation id (e.g., Supabase Storage or a CDN).
- Increase concurrency limits with caution; add a per-process semaphore if needed.

---

## TD-005: WhatsApp Number-to-Words Converter Duplicated

**Status:** open
**Region:** app

### Description

The Bengali number-to-words converter exists in `lib/utils.ts` (`numberToWordsBengali`) AND is re-implemented inside the receipt route (`app/api/receipts/[id]/route.ts`). The receipt route can't import from `lib/utils.ts` cleanly because of bundling constraints, so the logic is duplicated.

### Recommended action
- Extract to a single shared module (e.g., `lib/bengali-number-to-words.ts`) imported by both, with unit tests for edge cases (lakh/koti, zero, trailing nuances).

---

## TD-006: Two Browser Supabase Client Implementations

**Status:** open
**Region:** app

### Description

`lib/supabase-client.ts` (getSupabase singleton with mock fallback) and `lib/supabase/client.ts` (createBrowserClient) both exist. Most pages import the former; a few import the latter. Minor divergence risk in client configuration.

### Recommended action
- Delegate one to the other (e.g., `supabase-client.ts` re-exports the `@supabase/ssr` browser client) and audit imports so there's exactly one source.

---

## TD-007: Excel and PDF Export Implementations Overlap

**Status:** open
**Region:** reports

### Description

Reports support export via both `xlsx` and `exceljs`, and PDF via `jsPDF`. Two spreadsheet libraries in the dependency tree serve overlapping purposes, increasing bundle size and maintenance surface.

### Recommended action
- Consolidate on `exceljs` (richer styling) or `xlsx` (lighter), and drop the other if nothing depends on it.