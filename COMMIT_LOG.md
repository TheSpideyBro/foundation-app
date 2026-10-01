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

## d06efa7 — feat(receipt): masthead in Li Sabbir Sorolota (custom font)

**Date:** 2026-10-01  
**Author:** Muse (for Akash)  
**Branch:** feat/premium-receipt  
**Files changed:** app/fonts/LiSabbirSorolotaUnicode-Regular.ttf, app/fonts/LiSabbirSorolotaUnicode-Italic.ttf (new), app/layout.tsx, app/globals.css, app/donations/[id]/receipt/ReceiptPaper.tsx, CHANGELOG.md

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Masthead font | Baloo Da 2 bold | **Li Sabbir Sorolota** (Akash's font, 26/30px, no faux-bold) |

### Why

Akash supplied the font file and asked for it on the receipt's main header. Only the Unicode TTFs are bundled (ANSI variants are legacy-encoded, not for web). Dropped `font-bold` — the font ships a single 400 weight and synthetic bold distorts Bengali conjuncts.

### Tests Run

- `pnpm exec tsc --noEmit` — clean
- `pnpm build` — green (`@font-face` + woff2 emitted correctly)

### Known Risks / Follow-ups

- Lipighor license: free for designs, but **webfont use on the live site needs email permission (admin@lipighor.com) + a footer backlink to lipighor.com** — flagged to Akash.
- Still awaiting Akash's visual approval before push/PR.

---

## 0ad5eb6 — feat(receipt): QR and signature side by side, tighter page

**Date:** 2026-10-01  
**Author:** Muse (for Akash)  
**Branch:** feat/premium-receipt  
**Files changed:** app/donations/[id]/receipt/ReceiptPaper.tsx, CHANGELOG.md

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| QR card + signature | Stacked full-width rows | One 2-column row: QR card left, signature right (stacks below 420px) |
| Gratitude position | Between QR card and signature | Above the row, so signature stays last |
| Density | Roomy | Tightened throughout (container pt/pb 8→6, smaller meta/amount/details/gratitude/footer gaps) |

### Why

Akash: make the page more compact and put QR + signature পাশাপাশি.

### Tests Run

- `pnpm exec tsc --noEmit` — clean
- `pnpm build` — green (one transient Turbopack font-fetch failure on first attempt; clean on retry)

### Known Risks / Follow-ups

- Still awaiting Akash's visual approval before push/PR.

---

## 6c6a207 — feat(receipt): remove office seal, tighten signature spacing

**Date:** 2026-10-01  
**Author:** Muse (for Akash)  
**Branch:** feat/premium-receipt  
**Files changed:** app/donations/[id]/receipt/ReceiptPaper.tsx, CHANGELOG.md

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| অফিস সিল column | Present beside collector signature | Removed entirely |
| Signature name ↔ line gap | `-mb-2` — name floated above the line | `-mb-4` — name sits on the line |

### Why

Akash: the seal isn't needed, and the signature name had too much space above the line.

### Tests Run

- `pnpm exec tsc --noEmit` — clean

### Known Risks / Follow-ups

- Still awaiting Akash's visual approval before push/PR.

---

## c0737ae — feat(receipt): signature-style collector name on the signature line

**Date:** 2026-10-01  
**Author:** Muse (for Akash)  
**Branch:** feat/premium-receipt  
**Files changed:** app/donations/[id]/receipt/ReceiptPaper.tsx, CHANGELOG.md

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Collector name | Plain Hind Siliguri text below "আদায়কারীর স্বাক্ষর" label | Galada calligraphic script sitting on the signature line (slight overlap, like a handwritten signature) |

### Why

Akash: the name should look like a signature on the line, not a caption under it. Reused the already-loaded Galada font so no new font payload.

### Tests Run

- `pnpm exec tsc --noEmit` — clean

### Known Risks / Follow-ups

- Still awaiting Akash's visual approval before push/PR.

---

## fcd73da — feat(receipt): use Anek Bangla for details rows

**Date:** 2026-10-01  
**Author:** Muse (for Akash)  
**Branch:** feat/premium-receipt  
**Files changed:** app/donations/[id]/receipt/ReceiptPaper.tsx, app/layout.tsx, app/globals.css, CHANGELOG.md

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Details rows (প্রদানকারী, মাসের নাম, মাধ্যম, আদায়কারী) | Hind Siliguri | **Anek Bangla** (400–700, `--font-anek` token) |

### Why

Akash asked for a more stylish Bangla font for the detail labels/values. Anek Bangla is a modern, characterful Bengali sans — distinct from the Baloo Da 2 headings and Galada gratitude line, and still highly legible for data.

### Tests Run

- `pnpm exec tsc --noEmit` — clean
- `pnpm build` — green

### Known Risks / Follow-ups

- Still awaiting Akash's visual approval before push/PR.

---

## 170d3af — feat(receipt): add letterhead contact details under masthead

**Date:** 2026-10-01  
**Author:** Muse (for Akash)  
**Branch:** feat/premium-receipt  
**Files changed:** app/donations/[id]/receipt/ReceiptPaper.tsx, CHANGELOG.md

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Masthead | Foundation name only | Name + contact line: address (দৌলখাঁড় পূর্বপাড়া, নাঙ্গলকোট, কুমিল্লা) and phones (০১৮৪০-৮২৮০১০ · ০১৮১৪-৯৪৮২২৪) with gold MapPin/Phone icons |

### Why

Akash asked to add contact/address details, pointing at the old receipt — the legacy JPEG receipt (`app/api/receipts/[id]/route.ts` lines 205–206) carries exactly this address and these two phone numbers, so they were lifted verbatim.

### Tests Run

- `pnpm exec tsc --noEmit` — clean
- `pnpm build` — green

### Known Risks / Follow-ups

- Hardcoded foundation constants (same as the legacy receipt). If numbers change, update both this file and the JPEG route.
- Still awaiting Akash's visual approval before push/PR.

---

## 7f771fe — feat(receipt): stylish fonts and compact layout per feedback

**Date:** 2026-10-01  
**Author:** Muse (for Akash)  
**Branch:** feat/premium-receipt  
**Files changed:** app/donations/[id]/receipt/ReceiptPaper.tsx, app/layout.tsx, app/globals.css, CHANGELOG.md

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Display font | Tiro Bangla serif for masthead + amount | **Baloo Da 2** (bold, rounded) for foundation name + amount hero |
| Gratitude line | Tiro Bangla bold | **Galada** calligraphic script for "জাযাকাল্লাহু খাইরান" |
| দান রসিদ eyebrow | `tracking-[0.42em]` — looked gappy/broken in Bengali | `tracking-[0.12em]` (same fix for other Bengali eyebrow labels) |
| QR card | Raw verify URL text under the title | URL line removed; title + caption only |
| Density | ~1250px tall paper, lots of scroll | Tightened throughout (48px seal, 42–50px amount, 88px QR, reduced paddings) |

### Why

Akash's design feedback on the v1 preview: wanted a more stylish Bengali font, the wide-tracked "দান রসিদ" looked broken, the URL next to the QR was clutter, and the receipt needed to fit with less scrolling.

### Tests Run

- `pnpm exec tsc --noEmit` — clean
- `pnpm lint` — 0 errors (140 pre-existing warnings)
- `pnpm build` — green (fonts download at build time, no errors)

### Known Risks / Follow-ups

- Baloo Da 2 / Galada are new global font payloads (bengali subsets only) — negligible size impact, display=swap.
- Awaiting Akash's visual approval on v2 preview before push/PR.

---

## 82f966d — feat(receipt): premium paper receipt redesign with QR verification card

**Date:** 2026-10-01  
**Author:** Muse (for Akash)  
**Branch:** feat/premium-receipt  
**Files changed:** app/donations/[id]/receipt/ReceiptPaper.tsx (new), app/donations/[id]/receipt/page.tsx, app/api/qr/route.ts (new), CHANGELOG.md, docs/product/FEATURE_MAP.md

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Receipt layout | Plain white card, emerald gradient header, dashed detail rows | Editorial ivory "paper" on dark stage: gold hairline frame, emerald/gold brand bands, Landmark masthead seal |
| Amount display | One row in a detail list ("টাকার পরিমাণ") | Large Bengali amount hero (54–64px Tiro Bangla) with কথায় line between gold rules |
| QR code | ExternalLink text link to /verify/{receipt_no} | Scannable QR card: same-origin PNG from new /api/qr endpoint + verify URL caption |
| Foundation name | Decomposed ড+় spelling in HTML receipt | Canonical ড় spelling, matching the JPEG receipt |
| Print | `.receipt-print` max 148mm, border fallback | Toolbar hidden, white stage, exact color adjust, max 175mm |
| Code structure | All markup inline in page.tsx | Pure presentational `ReceiptPaper.tsx`; page keeps data/batch/auth logic |

### Why

Akash asked for a premium receipt in the foundation's emerald/gold identity, designed freely (not bound to the old reference). No allocation/ledger logic touched.

### Tests Run

- `pnpm exec tsc --noEmit` — clean
- `pnpm lint` — 0 errors (140 pre-existing warnings)
- `pnpm build` — green, 31/31 routes incl. `/api/qr` and `/donations/[id]/receipt`
- `GET /api/qr?text=...` — 200 image/png (240×240)
- Static render check of ReceiptPaper (react-dom/server) — markup + QR img + icons render

### Known Risks / Follow-ups

- Visual QA was via static markup render, not a live screenshot (no working browser/screenshot path in this environment) — Akash should eyeball the preview before merge.
- `/api/qr` has no auth; input capped at 512 chars and only encoded (never fetched), so abuse surface is minimal.
- `NEXT_PUBLIC_SITE_URL` should be set in production so QR verify URLs use the public domain (request-origin fallback exists).

---

## 40b056b — fix(joma): repair status block dropped in rebase resolution

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `app/joma/page.tsx`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Status badge wrapper | `{allocationPreview.allocations.length > 0 && (` line dropped in the 555d111 rebase resolution; dangling `)}` broke `tsc` (TS1381) | wrapper restored — badge only renders when the preview has allocations (user's behavior, per rebase policy) |
| `money(autoAllocatable)` call site | `Cannot find name 'money'` (TS2304) — the local helper was deleted in 555d111, main's auto-split code added a new call site | `formatMoney(autoAllocatable)` — finishes the `money()` → `formatMoney()` migration |

### Why

The rebase of 555d111 onto main's auto-split commit needed two manual merges in `app/joma/page.tsx`; both left compile breaks. Caught by `npx tsc --noEmit` on the rebased tree.

### Tests Run

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors, 140 warnings (all pre-existing)
- `npm run build` — ok, all routes including `/verify/[receipt_no]` and `/donations/[id]/receipt`

### Related

- Rebase of 555d111 (`feat(joma): form semantics, a11y, validation and button hierarchy`) onto 2b88e45

### Known Risks / Follow-ups

- None — restores the exact pre-rebase runtime behavior.

---

## 2b88e45 — feat(joma): derive the extra amount from the cash handed over

**Date:** 2026-10-01  
**Author:** AI Assistant (opencode)  
**Branch:** main  
**Files changed:** `app/joma/page.tsx`, `app/api/receipts/[id]/route.ts`, `app/donations/page.tsx`, `CHANGELOG.md`, `docs/product/FEATURE_MAP.md`, `docs/architecture/ACCOUNTING_DOMAIN.md`, `docs/architecture/DATA_FLOW.md`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Money inputs | "জমার পরিমাণ" (allocatable) **+** editable "অতিরিক্ত জমা" box | one input, **মোট নগদ** (total cash); the extra is derived from the preview and shown in a read-only box |
| Submit payload | whatever the operator typed: `amount`, `extra_amount` | `amount = allocationPreview.allocatedAmount`, `extra_amount = allocationPreview.unallocatedAmount` |
| ৳1,400 over an Aug–Nov window worth ৳1,300 | only if the second box was filled; otherwise `extra_amount = 0` + anonymous অবণ্টিত row | always `amount = 1300`, `extra_amount = 100` |
| `donations.amount` | `p_amount + p_extra_amount` (unchanged) | unchanged — still the cash handed over, zero-sum untouched |
| Preview summary / confirm / success | three numbers, one of them the warning `⚠ ৳১০০অবণ্টিত` | মোট নগদ / বরাদ্দ / অতিরিক্ত জমা — same three numbers, one label each (BUG-028), extra is not a warning |
| Receipt + donations card label | `Extra Amount` / `extra` | `অতিরিক্ত জমা` (Bengali-first) |

### Why

Handing over more cash than the coverage window can absorb is normal (the ledger
already models it as an `unallocated` row), but making the operator compute and
type the split invited mistakes: a ৳1,400 entry stored `extra_amount = 0`, so the
donations card and Reports' extra column showed nothing while the ledger flagged
November as "overpaid". Splitting automatically keeps ONE number for the operator
and gives the extra amount its own field, card, report column and receipt line.

Engine parity was not touched: `calculatePaymentAllocation()` /
`calculate_payment_allocation()` still receive the allocatable `amount`, and the
SQL RPC still stores the extra as its own `month = NULL` row — exactly what the
manual flow produced when the boxes were filled correctly.

### Tests Run

- [x] `tsc --noEmit`, `eslint .`, `pnpm build` — clean
- [x] `pnpm test:ledger` — 28/28 (canonical engine untouched)
- [x] `playwright test` — 3 passed, 6 skipped (the 6 need live credentials)
- [x] Split checked against the real engine: `1400 → 1300 + 100` (rows `08:100 09:1000 10:100 11:100`), `1300 → 1300 + 0`, `500 → 500 + 0`, `1400` over Sep alone → `1000 + 400`, and the zero-pledge edge `1400 → 1400 + 0` stored as `NULL:1400` (the RPC rejects `amount <= 0`)

### Related

- Bug: BUG-028 (one label per number)
- ADR-001 (canonical engine — unchanged)

### Known Risks / Follow-ups

- `donations.extra_amount` is Main-only; the Test project's `save_payment_entry` has no `p_extra_amount`, so a Joma entry pointed at Test fails as it did before (TD-011).
- The zero-pledge edge stores the whole cash as `amount` with `extra_amount = 0`, so the donations card/Reports extra column stays 0 there even though the UI called it অতিরিক্ত জমা — the rows and totals are still correct.
- No unit test covers the split (it is four lines of arithmetic over the already-tested preview); worth one if the split ever grows rules.

---

## fc97bd0 — chore(lint): tighten no-explicit-any/no-unused-vars/exhaustive-deps to warn

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `eslint.config.mjs`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| `no-explicit-any`, `no-unused-vars`, `exhaustive-deps` | `off` | `warn` |
| `npm run lint` result | 0 errors, 0 warnings (silent) | 0 errors, 142 warnings (pre-existing, all surfaced) |

### Why

Audit M7 (first step of the lint-strict roadmap). Warnings don't fail CI, but new `any`s now surface instead of spreading silently.

### Tests Run

- `npm run lint` — 0 errors, 142 warnings (all pre-existing, triaged as legit `any` usage or unused vars in this pass).

### Related

- Audit report §4 item 24

### Known Risks / Follow-ups

- Full `any` cleanup is follow-up work, not this pass. `react-hooks/immutability` + `set-state-in-effect` stay `off` (too aggressive for this codebase).

---

## 53413c9 — feat(i18n): Bengali-first label sweep across reports/donations/members

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `app/reports/page.tsx`, `app/donations/page.tsx`, `app/members/page.tsx`, `app/admin/members/[id]/page.tsx`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Reports labels | "Search...", "Cash Received", "Covered Month", "মাসিক pledge" | "খুঁজুন...", "নগদ প্রাপ্তি", "মাস", "মাসিক প্রতিশ্রুতি" (+ Bengali month dropdowns, dates, statuses, roles) |
| Donations methods/dates | Raw "CASH", ISO dates | `methodLabels`, `formatDateBengali`, `monthLabelBengali` |
| Donations share fallback | Shared raw `/api/receipts/[id]` URL (401s for recipients) | Shares public `/verify/[receipt_no]` link |
| "Workflow / /joma only" stat card | Dev-speak label | "এই মাসের জমা" |
| `/admin/members/[id]` | Orphan (no link pointed to it) | Linked from members list ("বিস্তারিত দেখুন", staff-only) |
| Buttons | Ad-hoc classes | `.btn-emerald` / `.btn-outline` design-system classes |
| Icon buttons | No accessible names | Bengali `aria-label`s |

### Why

UI review M4/M5/M6/M10/M14/M16/M17/L14/L15 — Bengali-first rule (AGENTS.md): users should never see English UI strings in normal flows.

### Tests Run

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors
- `npm run build` — 30/30 routes

### Related

- Bug: none (label sweep, UI review items)

### Known Risks / Follow-ups

- `xlsx` import on reports page moved to `@e965/xlsx` (same change as 5cd16d5).

---

## 316cf4e — feat(a11y): drawer a11y, safe-area, error boundaries, back-nav consistency

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `components/layout.tsx` (major), `app/not-found.tsx` + `app/error.tsx` (new), `components/AdminBackLink.tsx` (new), `app/layout.tsx`, `public/manifest.json`, `app/globals.css`, `app/page.tsx`, 7 admin pages (back-nav)

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Mobile drawer | Plain div, no keyboard support | Escape closes, focus trap (in on open, back to hamburger on close), `role="dialog"`, `aria-modal`, `inert` when closed, Bangla labels, `aria-expanded` on hamburger |
| Active nav indication | Visual only | `aria-current="page"` on sidebar/drawer/bottom-nav (admin matches pathname prefix) |
| 404 / crash | Raw Next.js pages | Branded Bengali `not-found.tsx`; `error.tsx` boundary with "আবার চেষ্টা করুন" retry |
| Safe area | Dead `pb-safe` class (no such utility) | `pb-[env(safe-area-inset-bottom)]` + `viewportFit: "cover"` in layout |
| Touch targets | 32–40px icon buttons | 44px (hamburger, drawer close, admin back buttons) |
| Manifest | Mismatched theme/background colors | `#059669` / `#FDFDFC` (no splash flash) |
| Footer | Dead `href="#"` links | Unwrapped (no phone/website published anywhere in repo — nothing invented) |
| Admin back-nav | users/pledge-history/audit had none; inconsistent | Shared `AdminBackLink` component; 44px + Bangla aria-labels everywhere |
| Bottom nav (staff) | "খরচ" tab | "জমা" tab (ReceiptText icon); খরচ still in drawer |

### Why

UI review H6/M1/M8/M9/M11/L1/L2/L4/L5/L6; audit L4 (partial). Also removed 2 unused icon imports (`Bell`, `Search`).

### Tests Run

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors
- `npm run build` — 30/30 routes

### Related

- Bug: none (a11y/shell, UI review items)

### Known Risks / Follow-ups

- No full offline mode: `sw.js` kept as cache-clearing no-op; the word "offline" appears nowhere in manifest/layout/README/docs, so there was nothing misleading to remove. Full offline = future work.

---

## e7cc06b — fix(expenses): inline errors, amount guard, Bengali formatting, skeletons

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `app/expenses/page.tsx`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Error display | 3× native `alert()` | Inline banners: modal-internal (validation + save), page-top (delete) |
| Amount validation | Any number; `<= 0` failed at DB with English constraint error | `amount <= 0` rejected client-side with Bengali message; `min="0.01"`, `inputMode="decimal"` |
| Amounts/dates | Raw numbers, ISO dates | `formatMoney` (Bengali digits), `formatDateBengali` |
| `proof_url` state | Dead state (no UI ever set it) | Removed |
| Loading | Bare spinner | Layout-matched skeleton rows |

### Why

UI review H7/H8/M7(partial)/M16. Delete still uses native `confirm()` (out of scope).

### Tests Run

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors
- `npm run build` — 30/30 routes

### Related

- Bug: BUG-038

### Known Risks / Follow-ups

- None.

---

## f863b55 — feat(joma): form semantics, a11y, validation and button hierarchy

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `app/joma/page.tsx`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Entry UI | Divs + click handlers | Real `<form noValidate onSubmit>` — Enter submits like Save; `noValidate` keeps manual Bengali validation (no browser English tooltips) |
| Amount inputs | `type="number"` only | + `inputMode="decimal"` (mobile decimal keyboard) |
| Member combobox | No ARIA roles | `role=combobox/listbox/option`, `aria-expanded`, `aria-selected`; "কোনো সদস্য পাওয়া যায়নি" empty state |
| Disabled Save | Silent | Explains itself ("প্রথমে সদস্য নির্বাচন করুন" …) |
| Confirm dialog | No keyboard support | Escape closes; focus in on open, returns on close; Tab cycles inside (no new dep) |
| Validation | `paymentAmount > 0` required | `paymentAmount + extraAmount > 0` (extra-only allowed client-side) |
| Pledge toggle | "ON"/"OFF" | "চালু"/"বন্ধ" |
| Money formatting | Duplicate local `money()` with `Math.round` | Shared `formatMoney` (fractional paisa now displays — behavior change, more accurate) |
| Buttons | Ad-hoc | `.btn-emerald` / `.btn-outline` hierarchy |

### Why

UI review H11/M12(client half)/L12/L13.

### Tests Run

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors
- `npm run build` — 30/30 routes

### Related

- Bug: none (UI review items)

### Known Risks / Follow-ups

- **Server still requires `amount > 0`** (`app/api/payments/route.ts`) — a pure extra-only entry passes client validation but 400s at the API. Relaxing the API rule is out of scope for this page-level commit; needs a follow-up decision.

---

## 6d0ff1a — feat(auth): login callbackUrl, password visibility, signup validation

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `app/login/page.tsx`, `app/signup/page.tsx`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Post-login redirect | Always `/dashboard` | Honors `?callbackUrl=` after same-origin check (must start with `/`, not `//`; falls back to `/dashboard`) |
| `useSearchParams` | — | Wrapped in `Suspense` (Next.js 16 static prerender requirement) |
| Password fields | Always masked | Eye/EyeOff toggles with Bangla aria-labels on all 3 (login + signup + confirm) |
| Signup errors | `alert()` + raw `error.message` (English leaked) | Inline banners; Supabase errors mapped to Bengali ("User already registered" → account-exists message) |
| Phone validation | Basic | `^01[3-9]\d{8}$` after trim; `inputMode="tel"` on both phone inputs |
| Password hint | None | "কমপক্ষে ৬ অক্ষর" (matches `supabase/config.toml` minimum_password_length = 6) |

### Why

UI review H5/H9/H10/M14/L11. Kept: double-submit guard, non-user-enumerating login error message.

### Tests Run

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors
- `npm run build` — 30/30 routes (no prerender bailout for `/login`)

### Related

- Bug: BUG-037

### Known Risks / Follow-ups

- None.

---

## 7c0c762 — perf(admin): paginate audit log; require auth on sync-sheets status

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `app/admin/audit/page.tsx`, `app/api/sync-sheets/route.ts`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Audit log load | Entire `audit_log` table in one query | `.range()` pagination, 50/page, "আরো দেখুন" load-more; search filter over loaded rows; total in Bengali digits |
| `GET /api/sync-sheets` | No auth — revealed Sheets-backup config status anonymously | `requireAuth("admin")` |

### Why

Audit M6 (audit half), L1. No client calls GET (only POST), so the auth gate breaks nothing.

### Tests Run

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors
- `npm run build` — 30/30 routes

### Related

- Bug: BUG-040, BUG-041

### Known Risks / Follow-ups

- None.

---

## 5cd16d5 — feat(admin): harden bulk import — template, preview/confirm, per-row errors, cap

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `app/admin/bulk/page.tsx`, `app/api/admin/bulk/route.ts`, `package.json`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Spreadsheet parser | `xlsx@0.18.5` (unmaintained, known vulns) | `@e965/xlsx@0.20.3` drop-in (same `read`/`utils` API, patched CVEs) |
| Import flow | File select → instant POST | Template download (exact headers) → validation (5 MB, extension/MIME, try/catch Bengali errors) → preview (Bengali row count + first-5-rows table) → "নিশ্চিত করুন" confirm → POST |
| Row cap | None | 500 rows, enforced client + server (413) |
| Server validation | Inserted rows as received | Per-table column allow-list + type checks (members/donations/expenses) before insert — fail-closed, nothing inserts if any row errors; per-row `{row, error}` list (Bengali, max 50) |
| Export endpoint | Unbounded | `limit` (default 1000, max 5000) / `offset` pagination |
| Progress/status | Silent | Progress text, `role="status"`, section-title success messages; ReceiptText icon for expenses |

### Why

Audit H1/M3/M6(export half); UI review H4/M13.

### Tests Run

- `npx tsc --noEmit` — clean
- `@e965/xlsx` import smoke test (`read` function, `utils` object present)
- `npm run lint` — 0 errors
- `npm run build` — 30/30 routes

### Related

- Bug: BUG-033, BUG-039
- Tech Debt: none

### Known Risks / Follow-ups

- **`pnpm-lock.yaml` still points at old `xlsx`** — pnpm isn't installed in this environment, so the lockfile couldn't be regenerated. Run `pnpm install` before deploy.

---

## e28c1f0 — fix(auth)!: remove founder email bypass; users.role is the single source

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `lib/auth.ts`, `lib/server-auth.ts`, `app/api/payments/route.ts`, `.env.example`, `SETUP.md`, `app/dashboard/page.tsx`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| `isAdmin()` / `isStaff()` | `true` for a hardcoded founder email regardless of `users.role` | Purely `users.role`-based |
| `FOUNDER_EMAIL` / `isFounder()` | Existed in `lib/auth.ts` (+ `NEXT_PUBLIC_FOUNDER_EMAIL` in `.env.example`) | Deleted everywhere |
| Payments API collector check | `… \|\| isFounder(collector.email)` | `isApproved(collector.is_approved) && isStaff(collector.role)` |
| Page call sites | `hasAdminRole(role, user?.email)` | `hasAdminRole(role)` (~15 pages; mechanical hunks ride in their workstream commits on this branch) |

### Why

Audit H2 — privilege conferred by a string literal, not by data; could not be revoked from the database. TD-001 → resolved.

### Tests Run

- `grep -r "isFounder\|FOUNDER_EMAIL"` — clean
- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors
- `npm run build` — 30/30 routes

### Related

- Bug: BUG-034
- Tech Debt: TD-001 (resolved)

### Known Risks / Follow-ups

- ⚠️ **DEPLOY GATE:** confirm the founder's `users.role = 'admin'` in the LIVE database before deploying, or the founder will be locked out of admin screens and APIs. `/admin/users` can set the role.

---

## fe6467b — feat(receipts): add accessible HTML receipt view with print styles

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `app/donations/[id]/receipt/page.tsx` (new)

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Receipt access | JPEG only — invisible to screen readers, text not copyable | + accessible HTML view: receipt no, donor, amount (Bengali digits + কথায়), month coverage with batch consolidation (mirrors JPEG generator), date, collector, payment method, extra amount |
| Printing | Screenshot/print the JPEG | Print button + scoped `@media print` CSS (hides nav/buttons, clean layout) |
| Sharing | Raw `/api` URL (401s for non-logged-in recipients) | Links out to public `/verify/[receipt_no]` |

### Why

UI review H3, M2 (print). Auth follows the repo's existing client-page pattern (`useAuth` + `isStaff`).

### Tests Run

- `npx tsc --noEmit` — clean (2 type errors found and fixed during dev: single-arg `hasStaffRole`, embedded-relation array typing)
- `npm run lint` — 0 errors
- `npm run build` — 30/30 routes, `ƒ /donations/[id]/receipt` dynamic

### Related

- Bug: none (UI review items; companion to BUG-032's verify page)

### Known Risks / Follow-ups

- None.

---

## 098fb7a — fix(security): enable CSP header and SAMEORIGIN frame policy

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `next.config.ts`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Content-Security-Policy | Commented out entirely | Enabled, adapted: `script-src 'self' 'unsafe-inline'` (Next.js App Router inline bootstrap scripts), `style-src 'self' 'unsafe-inline'` + Google Fonts (Tailwind v4), `font-src` googleapis/gstatic, `img-src data:/blob:/https:`, `connect-src 'self'` + `*.supabase.co`; `api.qrserver.com` dropped (QR is server-generated) |
| `X-Frame-Options` | `DENY` — blocked the app's own receipt preview iframe on `/donations` (blank preview) | `SAMEORIGIN` |
| `X-XSS-Protection` | Deprecated header sent | Removed |

### Why

Audit M1; UI review H1.

### Tests Run

- `npm run build` — green; receipt preview iframe loads same-origin again.

### Related

- Bug: BUG-035, BUG-036 (partial — the middleware fail-closed change rode in 95ae1ea)

### Known Risks / Follow-ups

- `script-src` keeps `'unsafe-inline'` because static headers can't do per-request nonces — nonce-based CSP is future work (noted in config). Deliberate, documented deviation.

---

## 95ae1ea — feat(verify): add public receipt verification page

**Date:** 2026-10-01  
**Author:** Muse  
**Branch:** fix/audit-ui-review-fixes  
**Files changed:** `app/verify/[receipt_no]/page.tsx` (new), `middleware.ts`, `app/api/receipts/[id]/route.ts`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Receipt QR codes | Pointed at `/verify/{receipt_no}` — a route that didn't exist (404 on every scan) | New public page: "যাচাইকৃত রসিদ" badge, masked donor name (first 3 code points + •••), amount in Bengali digits + words, month, date, collector; branded "রসিদ পাওয়া যায়নি" card for unknown numbers |
| QR payload domain | Hardcoded `https://daulkharfoundation.vercel.app` | `NEXT_PUBLIC_SITE_URL` with `request.nextUrl.origin` fallback + "স্ক্যান করে যাচাই করুন" caption |
| Middleware public paths | `/verify/*` redirected to login | `/verify` + `/verify/*` whitelisted |
| Middleware env handling | Skipped the auth gate when Supabase env was missing (fail-open) | Fails closed — protected routes redirect to `/login` when env is missing |

### Why

Audit H2/M2 (dead QR trust feature); UI review C1. Lookup uses the service-role key inside the Server Component only, selecting only verification fields (AGENTS.md rule 1).

### Tests Run

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors
- `npm run build` — 30/30 routes, `ƒ /verify/[receipt_no]` dynamic

### Related

- Bug: BUG-032, BUG-036

### Known Risks / Follow-ups

- Old printed receipts (QR encoding the old hardcoded domain) still point at the wrong place — paper already printed can't be fixed.

---

## 6d90c60 — fix(migrations): add the missing pledge row so October onward charges ৳100

**Date:** 2026-10-01  
**Author:** AI Assistant (opencode)  
**Branch:** main  
**Files changed:** `supabase/migrations/20261001_pledge_history_akash_october.sql` (new), `docs/database/SCHEMA.md`, `docs/decisions/BUGS.md`, `CHANGELOG.md`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| `member_pledge_history` for member `a40ef6db…` | `2026-08 → ৳100`, `2026-09 → ৳1,000` | + `2026-10 → ৳100` (existing rows untouched) |
| Ledger expected, `2026-10` / `2026-11` / `2026-12` | ৳1,000 / ৳1,000 / ৳1,000 | ৳100 / ৳100 / ৳100 |
| Ledger expected, `2026-09` | ৳1,000 | ৳1,000 (unchanged, operator confirmed) |
| `members.monthly_pledge` | ৳100 | ৳100 (asserted, not rewritten) |
| `donations` / `payment_allocations` | 7,850 = 7,850 | unchanged (asserted) |

### Why

The display fix (`7768ab1`) only corrected the labels — the data was still wrong. His ৳100 change had been saved with `effective_from_month = 2026-08`, so the ADR-001 rule (latest history entry `<= month` → `members.monthly_pledge` → 0) priced October at ৳1,000 forever. Operator confirmed 2026-10-01: September stays ৳1,000, October onward ৳100.

The migration is idempotent (inserts only when no `2026-10` row exists) and transactional with three assertions: `2026-09 → 1000`, `2026-10 → 100`, `members.monthly_pledge = 100`. `NOTIFY pgrst, 'reload schema'` included. Data-only, so `supabase/schema.sql` needs no regeneration.

### Tests Run

- [x] Applied through the Management API wrapped in BEGIN/COMMIT → `[]` (no errors)
- [x] History query: 3 rows, new one `2026-10 → 100` with the note
- [x] ADR-001 rule re-run in SQL for `2026-08…2026-12` → `100, 1000, 100, 100, 100`
- [x] Zero-sum: `SUM(donations) = SUM(payment_allocations) = 7,850` (30 donations, 77 allocations)
- [x] Main only — the member does not exist on Test (per TD-011 the projects are never cross-seeded)

### Related

- Bug: BUG-031

### Known Risks / Follow-ups

- Ledger dues for this member drop from October onward (his September dues stay ৳1,000). Already-stored allocations are not rewritten — only what the ledger will *expect*.
- Members **edit form** still cannot insert a history row for an unchanged pledge value (it only writes when the amount differs), so corrections like this still need a migration.

---

## 7768ab1 — fix(joma): show the resolved pledge everywhere "current pledge" is displayed

**Date:** 2026-10-01  
**Author:** AI Assistant (opencode)  
**Branch:** main  
**Files changed:** `app/joma/page.tsx`, `app/admin/members/[id]/page.tsx`, `app/members/page.tsx`, `app/reports/page.tsx`, `docs/decisions/BUGS.md`, `CHANGELOG.md`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Joma card "বর্তমান মাসিক অঙ্গীকার" / "বর্তমান চাঁদা" / sidebar change arrow | raw `members.monthly_pledge` | `currentMonthPledge` = `resolvePledgeForMonth(curMonth, …)` (a pledge change pending in the form shows live) |
| `1x/2x/3x চাঁদা` quick buttons | `members.monthly_pledge` × multiplier | `coveragePledge` = resolved for `form.coverageStartMonth` (prices the month being paid, not today) |
| `/admin/members/[id]` header | raw `member.monthly_pledge` | resolved for the current month |
| `/members` list card | raw field; no history loaded | resolved; `fetchMembers()` now also reads `member_pledge_history` (a denied read degrades to the old raw value) |
| Reports members column + CSV/PDF | raw `m.monthly_pledge` | `effectivePledgeOf(m)` (history was already loaded there) |
| Engine fallback argument | `members.monthly_pledge` | **unchanged** — the SQL twin reads that field, so parity holds |

### Why

Live report (member `a40ef6db…`, Main): history `2026-08 → ৳100` (inserted 15 Sep) and `2026-09 → ৳1,000` (inserted 8 Sep) → `monthly_pledge = ৳100` while Sep/Oct/Nov resolve to ৳1,000. The card showed ৳100 next to a confirmation dialog allocating `1000/300/0` for a ৳1,300 entry, so the user expected `1000/100/100`. Only the labels were wrong — the preview, the SQL engine and the stored rows already agreed.

### Tests Run

- [x] `tsc --noEmit`, `eslint .`, `pnpm build` — clean
- [x] `pnpm test:ledger` — 28/28 (engine untouched; needed the official Node build under `/tmp/opencode/node-v22.22.1-linux-x64`)
- [x] `playwright test` — 3 passed, 6 skipped (the 6 need live credentials)
- [x] Cross-checked both engines against the live history: `1200 → 1000/200/0`, `1300 → 1000/300/0` (TS and SQL identical)

### Related

- Bug: BUG-031

### Known Risks / Follow-ups

- `/members` now issues one extra read (`member_pledge_history`) per fetch; on a denied read it logs a warning and keeps the old raw value.
- The Members **edit form** still prefills the raw `monthly_pledge` — correct, since that is the field being edited — but saving a change with an effective month earlier than an existing row still silently lets the later row win (BUG-031's data half). A save-time warning was proposed and not chosen yet.

---

## 261f4d5 — fix(migrations): apply the pledge change before allocating (BUG-021/022/023)

**Date:** 2026-09-30  
**Author:** AI Assistant (opencode)  
**Branch:** main  
**Files changed:** `supabase/migrations/20260930_pledge_change_before_allocation.sql`, `supabase/migrations-test/20260930_pledge_change_before_allocation.sql`, `supabase/schema.sql`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Pledge block position in `save_payment_entry()` / `reallocate_payment()` | *after* `v_pledge_history` was read and the allocations written (Main byte offsets: pledge 2249 > allocate 1430 > insert 1068) — a same-entry pledge change never priced that entry's own months | *before* the history read (pledge 2132 < insert 2772) — the read already contains the new row, so months ≥ the effective month are allocated at the new amount |
| Coverage span | uncapped `generate_series` in SQL vs `monthRange()` truncated at 121 rows in TS — a 122+ month window saved a different split than the one confirmed | span computed from `p_coverage_start`/`p_coverage_end`, `1..120` enforced in SQL (same limit the API and confirm dialog now enforce) |
| `p_pledge_effective_month` | unvalidated — a past month restated settled history, non-`YYYY-MM` corrupted `resolvePledgeForMonth()` string comparisons | format + `>= coverage start` checked before anything is written |
| Zero-sum | not asserted by the function | `RAISE EXCEPTION` if `SUM(payment_allocations) != SUM(donations)` aborts the transaction |

### Why

The Joma Entry review (BUG-021/022/023) found the pledge change being applied
*after* the allocation it was supposed to influence, and two silent divergence
paths between the TS preview and the SQL engine. Both were live on Main and Test.

### Tests Run

- [x] Applied to Main (`mlnzxhuozuyidpxepxex`) and Test (`pvfdgrdvvoytsfmjyvde`)
- [x] Manual verification (both projects, rolled back): pledge 100 → 150 effective `2026-09`, ৳150 payment → `sept_allocated = 150` (was 100), `member_pledge_after = 150`, `history_rows = 1`
- [x] Guard probes: 192-month window → `Coverage range must be between 1 and 120 months`; effective `2026-01` with coverage from `2026-09` → `Pledge effective month cannot be before the coverage start month`; effective `2026-13` / coverage `2026-1` → `... must be YYYY-MM`
- [x] Zero-sum: Main `7,850 = 7,850`, Test `7,442 = 7,442` (unchanged, 30/40 donations)
- [x] No test rows left behind (rolled back; `receipt_no LIKE 'ZZ-%'` = 0 on both)
- [x] `supabase/schema.sql` regenerated — diff limited to the two function bodies

### Related

- Bug: BUG-021, BUG-022, BUG-023
- Migration: `supabase/migrations/20260930_pledge_change_before_allocation.sql`, `supabase/migrations-test/20260930_pledge_change_before_allocation.sql`

### Known Risks / Follow-ups

- Main's `supabase_migrations.schema_migrations` ledger still stops at `20260907194636` (TD-011) — the catalog, not the ledger, is the record of what is applied.
- `enforce_member_self_update()` rejects the pledge update unless the caller's JWT role is `service_role`/admin/treasurer; the app path (service-role client in `/api/payments`) is unaffected, but a future caller without that claim will hit the BUG-018 guard.

---

## 9d1f168 — fix(payments): validate payment payloads end-to-end and repair the Joma flow

**Date:** 2026-09-30  
**Author:** AI Assistant (opencode)  
**Branch:** main  
**Files changed:** `app/api/payments/route.ts`, `app/joma/page.tsx`, `app/reports/page.tsx`

### What Changed (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| `POST/PUT /api/payments` `method` | any string (no CHECK on `donations.method`) | `cash\|bkash\|nagad\|bank` whitelist |
| `collected_by` | any existing `users` row — a member could be the recorded collector (RPC runs as `service_role`, RLS never saw it) | approved `admin`/`treasurer` or the founder, else `403` |
| `date` | presence only | real `YYYY-MM-DD`, at most server-today + 1 day |
| Coverage / pledge effective | presence only | `YYYY-MM`, span ≤ 120 months, effective ≥ coverage start |
| Error surface | raw `error.message` (constraint/column names, SQL fragments) in the UI banner | `{ code, error }` — Bengali text via `SQL_ERRORS`, raw SQL only in `console.error` |
| Reports cash fallback | `Number(d.amount) + Number(d.extra_amount)` → extra counted twice | `Number(d.amount)` only (amount already includes extra) |
| Joma role gate | staff gate evaluated while `role` was still `null` → flashed "প্রবেশাধিকার সংরক্ষিত" | auth-loading spinner renders first |
| Joma submit | no abort/timeout — button stuck on "সংরক্ষণ হচ্ছে..." forever | `AbortController` + 30 s timeout, aborted on unmount, Bengali retry message |
| Joma cancel / search / labels | `handleCancel()` → `/donations`; member search kept after save; three numbers under "অবণ্টিত"; English "Extra Amount"; `৳{row.expected}` bypassed `money()` | `router.back()` (fallback `/donations`); search cleared on success; one number per label + অতিরিক্ত জমা / মোট নগদ rows; `money()` everywhere; collector seeded only if in the loaded list |

### Why

Joma Entry review found the API trusting the client for every field it could
validate server-side, and the page's own UI inconsistent between preview,
confirmation and receipt — so users could not reconcile what they confirmed
against what was saved.

### Tests Run

- [x] `tsc --noEmit`, `eslint .`, `pnpm build` — clean
- [x] `pnpm test:ledger` — 28/28 (allocation engine untouched)
- [x] `playwright test` — 3 passed, 6 skipped (the 6 need live credentials)

### Related

- Bug: BUG-024, BUG-025, BUG-026, BUG-027, BUG-028, BUG-029, BUG-030

### Known Risks / Follow-ups

- The ≤120-month and collector-role limits are also enforced in SQL (`261f4d5`), so a stale server cannot be bypassed — but an older client against a newer API gets the API's message, not the SQL one.
- `/donations` and `/expenses` still lack the auth-loading spinner gate (only Joma was in scope for BUG-027).

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