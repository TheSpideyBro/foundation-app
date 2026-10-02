# Foundation App — UI/UX Review Report

**Repo:** `TheSpideyBro/foundation-app` · **Date:** 2026-10-01 · **Bhasha:** Banglish
**Scope:** Pura UI/UX review — code pore (page.tsx/layout.tsx, components, globals.css, manifest, middleware). Kono file change kora hoyni.

---

## 1. Overview

### App-ta ki
"দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন" — ekta community foundation-er **fund-management PWA**. Sodossho-der monthly joma (pledge) track kora, donation entry, khoroch-er hisab, receipt generate kora, ar report dekha — ei holo main kaj. User-ra non-technical community member, beshirbhag mobile diye chalabe.

### Stack (code onujayi)
- **Next.js 16.2.12** (App Router) + React + TypeScript (strict)
- **Tailwind CSS v4** (`@theme` diye design token: emerald `#059669`/`#064E3B`, amber accent, warm off-white `#FDFDFC` background)
- **shadcn-ui:** repo topic-e lekha thakleo code-e **asole use hoyni** — kono `components/ui/` dir nai, kono radix dependency nai. Custom Tailwind component class (`.btn-emerald`, `.btn-outline`, `.card-premium`, `.table-container`) + lucide-react icon diye UI banano.
- **Supabase** (auth + data), **next/font** diye Bangla font (Tiro Bangla headings, Hind Siliguri body)
- PWA: `manifest.json` + `sw.js` ache, kintu **service worker disabled** (shudhu cache clear kore pass-through)

### Route map (19-ta route)
| Route | Ki | Ke dekhte pare |
|---|---|---|
| `/` | Landing page | shobai |
| `/login`, `/signup` | Auth | shobai |
| `/dashboard` | Dashboard (stats, notices) | shob logged-in user |
| `/members` | Sodossho talika | shobai |
| `/joma` | Joma entry (payment form) | admin, treasurer |
| `/donations` | Dan talika + receipt preview/download/share | shobai |
| `/expenses` | Khoroch-er hisab | shobai |
| `/reports` | Report (donation/expense/member/collector tab) | shobai |
| `/profile` | Nijer profile | shobai |
| `/admin` | Admin hub | admin |
| `/admin/users` | User control | admin |
| `/admin/audit` | Audit log | admin |
| `/admin/pending` | Pending approvals | admin |
| `/admin/bulk` | Bulk import (Excel) | admin |
| `/admin/categories` | Category manage | admin |
| `/admin/notices` | Notice manage | admin |
| `/admin/pledge-history` | Ongikar itihash | admin, treasurer |
| `/admin/members/[id]` | Member detail/ledger | admin (kintu **orphan** — niche dekho) |
| `/verify/[receipt_no]` | **NAI** — QR code ekhane point kore, kintu route-ta exist kore na | — |

### Navigation structure
- **Desktop:** fixed sidebar (7-ta menu + "অ্যাডমিন কন্ট্রোল" section), role diye filter hoy
- **Mobile:** fixed top header + bottom nav (হোম/দান/খরচ/সদস্য/প্রোফাইল) + slide-out drawer (full menu)
- Route protection: `middleware.ts` unauthenticated-ke `/login?callbackUrl=...` diye redirect kore

### Motamuti bhalo dik (positive)
- Design system `CLAUDE.md`-te documented, ar beshirbhag jaygay follow kora hoyeche (emerald identity, rounded-2xl geometry, Bangla typography)
- Role-based nav thik ache — **kono visible-kintu-forbidden link nai**; admin section alada heading-e clear
- Joma form-e **Bangla validation message**, live allocation preview, duplicate-receipt handling — most-used form hishebe solid base
- Login-e double-submit guard (`disabled={loading}`), ar error message user-enumeration kore na ("ফোন নম্বর বা পাসওয়ার্ড ভুল")
- Table-gulo `overflow-x-auto` diye mobile-e scroll hoy; `.mobile-list-card` pattern ache
- Receipt canvas-e thik Bangla font use hoy (HindSiliguri, MainakBuniyadi-Italic signature-er jonno)
- Reports-e empty state ache ("কোনো তথ্য পাওয়া যায়নি")

---

## 2. UI Issues (severity onujayi)

### 🔴 Critical (1-ta)

**C1. Receipt-er QR code dead link-e point kore — `/verify` route-tai nai**
- `app/api/receipts/[id]/route.ts:366` — QR payload: `https://daulkharfoundation.vercel.app/verify/${receipt_no}`
- Kono `app/verify/**/page.tsx` nai (confirm kora). **Prottekta printed/downloaded receipt-er QR scan korle user ekta English Next.js 404 page-e jabe** — "ei rosid asol kina" verify korar kono upay nai. Eta trust feature, puropuri non-functional.
- *Fix:* `app/verify/[receipt_no]/page.tsx` banao (public, login chara) + `middleware.ts`-er public-path list-e `/verify/*` add koro. Verify page-e thakbe: ✅/❌ "যাচাইকৃত রসিদ" badge (emerald `#064E3B` + gold `#C9A227` branding), rosid number, **takar ongko Bangla songkhya + kothay** (already `numberToWordsBengali` ache), month coverage, tarikh, adaykari-r nam. **Donor name privacy:** receipt_no guess kora gele jekeo full name dekhte parbe — tai name partially mask koro (e.g. "রহি•••"), full details shudhu login-kora staff dekhbe. Invalid receipt_no hole branded "রসিদ পাওয়া যায়নি" page, 404-er bodle.

### 🟠 High (11-ta)

**H1. `X-Frame-Options: DENY` receipt preview iframe-ke block kore**
- `next.config.ts:20-21` — `/:path*` (jaar moddhe `/api/receipts/*`-o pore) shob response-e `DENY` pathay. `app/donations/page.tsx:124`-er preview `<iframe>` same-origin holeo DENY thakay browser image render korte refuse kore → **"প্রিভিউ" button chaple faka/error frame**.
- *Fix:* `X-Frame-Options` → `SAMEORIGIN` koro, athoba CSP `frame-ancestors 'self'` use koro. (Note: code theke deduce kora — live browser-e ekbar confirm kore neya bhalo.)

**H2. QR URL-e domain hardcode**
- `app/api/receipts/[id]/route.ts:366` — `https://daulkharfoundation.vercel.app` string-e hardcode. Custom domain-e gele ba deploy URL change hole **ager printed shob receipt-er QR chirokaler jonno dead**.
- *Fix:* `NEXT_PUBLIC_APP_URL` env var theke URL nao, fallback-e request origin.

**H3. Receipt shudhu canvas JPEG — kono HTML view nai**
- `app/api/receipts/[id]/route.ts:120+` — server-side canvas-e 1000×1500 JPEG render hoy. Screen reader user-er jonno receipt puropuri inaccessible (ekta chobi matro), amount/date copy kora jay na, boro paper-e print korle blurry.
- *Fix:* `/api/receipts/[id]`-er pashe accessible HTML receipt view banao + `window.print()` button.

**H4. Bulk import-e template/confirm/per-row-error/row-cap — kichui nai** (data-corruption risk)
- `app/admin/bulk/page.tsx` — (a) kono template download ba expected-column guidance nai — user jane na Excel-e ki header lagbe; (b) file select korlei sathe sathe POST (line 45), **confirm-before-import step nai** — vul file dile data dhuke jay; (c) per-row error reporting nai, server ekta string error dey, kon row-te ki problem jana jay na; (d) kono row cap nai (API `route` line 58-e shudhu empty check) — security audit-eo High chilo.
- *Fix:* prottek section-e "টেমপ্লেট ডাউনলোড" button (correct headers shoho `.xlsx`), parse-er por row-count + first-5-rows preview + "নিশ্চিত করুন" dialog, API theke `{row, error}` list return, 500-row limit enforce + UI-te "সর্বোচ্চ ৫০০ সারি" notice.

**H5. Login `callbackUrl` ignore kore — deep link noshto**
- `middleware.ts:67-69` unauthenticated-ke `/login?callbackUrl=/expenses` diye pathay, kintu `app/login/page.tsx:33` `useSearchParams` porei na — shobshomoy `router.push("/dashboard")`. `/admin/pending` link-e click kore login korle user sekhane jay na.
- *Fix:* `callbackUrl` param poro, same-origin validate kore redirect koro, na thakle `/dashboard` fallback.

**H6. Mobile drawer-e kono accessibility handling nai**
- `components/layout.tsx` (~155-230) — Escape-e bondho hoy na, focus trap nai, `role="dialog"`/`aria-modal`/`aria-label` nai, hamburger button-e `aria-expanded` nai. Keyboard user-er kono path nai.
- *Fix:* Escape keydown listener + focus trap + `aria-modal="true"`, shob button-e `aria-label`, hamburger-e `aria-expanded={isSidebarOpen}`.

**H7. Expenses-er shob error `alert()` diye**
- `app/expenses/page.tsx:87, 116, 130` — native browser alert, PWA-te aro kharap. Validation + save error duitai.
- *Fix:* inline error banner use koro (`loadError` pattern already ache line ~140).

**H8. Expenses-e negative amount-er check nai**
- `app/expenses/page.tsx:84` — shudhu empty check; `type="number"`-e `min` attribute-o nai → **-৫০০ save hoye jete pare**.
- *Fix:* `amount <= 0` hole Bangla error + `min="0.01"` add koro.

**H9. Password visibility toggle nai (login + signup, 3-ta field)**
- `app/login/page.tsx:90`, `app/signup/page.tsx:134, 148` — mobile-e password type kora kothin, typo → failed login → rate-limit ("অনেকবার ভুল চেষ্টা") loop.
- *Fix:* Eye/EyeOff toggle add koro tin-ta field-ei.

**H10. Signup-er shob feedback `alert()`, ar raw English error leak**
- `app/signup/page.tsx:20, 42, 44` — mismatch/error/success tin-tai native alert (login-e inline banner ache — pattern mismatch). Line 42: `"সাইন-আপ ব্যর্থ: " + error.message` → "User already registered" er moto English leak hoy.
- *Fix:* login-er moto inline error banner + success state; known error-gulo Bangla-te map koro, unknown hole generic Bangla message.

**H11. Joma-r amount input-e `inputMode="decimal"` nai**
- `app/joma/page.tsx:790, 830, 1017` — `type="number"` ache kintu `inputMode` nai; Android/Chrome-e decimal separator chara keyboard ashte pare → poysha type kora jay na. (Expenses-e ache line 281 — ekhane nei.)
- *Fix:* shob amount input-e `inputMode="decimal"` add koro.

### 🟡 Medium (17-ta)

**M1. `loading.tsx` / `error.tsx` / `not-found.tsx` — konotai nai**
- Route-level boundary nai bole verify-404 ekhon English Next.js default page dekhay; kono route crash korle pura app blank. *Fix:* ontoto `app/not-found.tsx` (Bangla, branded) + `app/error.tsx` (retry button shoho) banao.

**M2. Kono print stylesheet nai**
- `app/globals.css`-e `@media print`/`@page` rule ektao nai. Receipt pray-i print hoy (paper trail), kintu ekhon 1000px JPEG manually print korte hoy — margin/page-size control nai. *Fix:* receipt HTML view-er jonno `@media print` CSS (A5/4×6, header/footer hide).

**M3. Service worker disabled — offline-e chole na**
- `public/sw.js` shudhu cache clear kore pass-through kore. PWA installable, kintu offline-e kono page-i load hoy na. *Fix:* conscious decision nao — hoy Workbox diye app-shell caching enable koro, na hoy manifest theke PWA claim komao.

**M4. Reports page-e English label-er chhora-chhori** (Bengali-first rule bhanga — AGENTS.md bole "Don't introduce English labels in UI")
- `app/reports/page.tsx:271` — search placeholder `"Search..."`; paid-member expand-e `"Cash Received"`, `"Covered Month"`, `"Selected Report Month"`, `"Allocated for Report Period"`, `"Unallocated / Extra"`; collector tab-e `"Role"`; member tab-e `"মাসিক pledge"` (mixed!). *Fix:* shob label Bangla koro ("নগদ প্রাপ্তি", "মাস", "নির্বাচিত মাস", "বরাদ্দ", "অতিরিক্ত" ityadi).

**M5. Donations page: method uppercase English + raw ISO date**
- Line 122 — `{donation.method || "cash"}` + `uppercase` class → "CASH"/"BKASH" dekha jay; `lib/utils`-er `methodLabels` (ক্যাশ/বিকাশ/নগদ/ব্যাংক) map ache kintu use hoyna. Date `{donation.date}` → "2026-10-01". *Fix:* `methodLabels[donation.method]` + `formatDateBengali()` use koro.

**M6. Dashboard-e dev-speak stat card**
- `app/donations/page.tsx:119` — "Workflow" label + "/joma only" value — internal route, user-er bojhar kotha na. *Fix:* card remove koro ba useful stat dao ("মোট সদস্য"/"এই মাসের জমা").

**M7. Expenses: Latin digit + raw ISO date + dead `proof_url` field**
- Line 215: `৳{Number(e.amount).toLocaleString()}` — locale chara Latin digits (AGENTS.md: "numerals are Bengali" violate). Line 204: `{e.date}` raw ISO. `proof_url` state-e ache (lines 32, 69, 78) kintu UI-te input nai — dead field. *Fix:* `.toLocaleString("bn-BD")`, `formatDateBengali(e.date)`, proof field hoy add koro na hoy soriye dao.

**M8. `pb-safe` class dead — iPhone safe-area handle hoy na**
- `components/layout.tsx:234` bottom nav-e `pb-safe`, kintu class-ta `globals.css`-e define nai, Tailwind v4-er default utility-o na → home-indicator thaka iPhone-e bottom bar-er niche padding ashe na. *Fix:* `pb-[env(safe-area-inset-bottom)]` use koro.

**M9. Touch target 44px-er niche**
- Mobile header hamburger `p-2` + 20px icon ≈ 36px (line 66); drawer close X ≈ 40px; admin sub-page back button ≈ 40px. Bottom nav item (~55px) thik ache. *Fix:* `p-3` ba `min-h-[44px] min-w-[44px]`.

**M10. `/admin/members/[id]` orphan route**
- Full-app grep-e kono `Link`/`router.push` ei route-e point kore na. Staff URL type na korle pouchatei pare na; members list theke detail-e jaoar path nai. *Fix:* members table row-ke `/admin/members/[id]`-te link koro, nahole route tule dao.

**M11. Nav-e `aria-current` nai; active-state shudhu color diye**
- `components/layout.tsx` — sidebar/bottom nav/drawer kothao `aria-current="page"` nai; color-blind user active item bujhbe na. `isActive` exact-match bole section-level orientation durbol. *Fix:* active link-e `aria-current="page"`; admin section-e `pathname.startsWith("/admin")` bibechona koro.

**M12. Joma form-er kichu UX gap**
- (a) Member search-e result na pele dropdown blank — "কোনো সদস্য পাওয়া যায়নি" message nai (line 734); (b) custom combobox-e `role="listbox"`/`aria-expanded` nai + `onBlur` 200ms timeout hack (~line 720) — shadcn Command/Popover use koro; (c) `<form>` element nai (line 320 comment) — Enter-e submit hoyna, browser autofill kaj kore na; (d) Save button disabled keno setar hint nai — helper text dao ("প্রথমে সদস্য নির্বাচন করুন"); (e) confirm dialog-e focus trap/Escape nai (line 544); (f) extra-only payment block hoye jay — validation-e `paymentAmount + extraAmount > 0` check koro.

**M13. Bulk import: progress/feedback gap**
- Loading overlay fullscreen block kore kintu progress indication nai (line ~148) — "N সারি প্রসেস হচ্ছে…" dekhao; success message-e English type id (`${type} সফলভাবে…` → "members সফলভাবে…", line 24) — section title use koro; count Latin digit-e (line 53) — `toBengaliNumber` use koro; status message `role="status"` diye screen reader-e announce koro.

**M14. Signup: phone validation + password hint nai**
- Jekono string accept kore `${phone}@foundation.app` banay — `^01[3-9]\d{8}$` regex + `.trim()` validate koro; password-e min-length hint nai ("কমপক্ষে ৬ অক্ষর" helper text dao).

**M15. Design-system drift**
- `.btn-emerald` use kore joma/login/signup — kintu donations, expenses, bulk ad-hoc (`bg-emerald-600 … py-3`, ~40px) button use kore; 48px min-height token mobile CTA-te maintain hoyna. *Fix:* shob primary CTA `btn-emerald`/`btn-outline`-e migrate koro.

**M16. Loading = shudhu spinner, kothao skeleton nai**
- Joma/donations/expenses/members — shob `Loader2`/CSS spinner; list page-e skeleton rows better perceived performance dey. *Fix:* ontoto list page-gulote skeleton rows add koro.

**M17. Share fallback recipient-ke 401 dekhay**
- `app/donations/page.tsx:53-62` — Web Share files support na korle raw `/api/receipts/{id}` URL share kore, kintu endpoint login + `canView` chara 401/403 dey → donor/WhatsApp recipient "Unauthorized" dekhbe. *Fix:* URL-er bodle JPEG file share/download koro, athoba public verify page-er (C1) link share koro.

### 🔵 Low (14-ta)

**L1.** Manifest `theme_color` (`#1B4332`) vs layout viewport `themeColor` (`#059669`) mismatch; `background_color` (`#EDEAE0`) vs page bg (`#FDFDFC`) mismatch — splash screen-e rong-er jhatka. *Fix:* duijaygay `#059669` / `#FDFDFC` use koro.
**L2.** `globals.css`-e `--font-inter` token define kora kintu Inter font kokhono load hoyna (`next/font`-e shudhu Tiro Bangla + Hind Siliguri) — dead token, font-stack confusion. *Fix:* token-ta tule dao.
**L3.** `#F8FAFC` (slate-50) 6 jaygay hardcode — warm off-white system theke slight deviation. *Fix:* token-e ano ba `gray-50` use koro.
**L4.** Landing footer-e dead `href="#"` link (`app/page.tsx:132-133`, Phone/Globe icon) — click-e page top-e jump. *Fix:* real `tel:` link dao ba icon soriye dao.
**L5.** Admin sub-page-e back-nav inconsistent — pending/bulk/categories/notices-e `/admin`-e back-Link ache, users/audit/pledge-history-te nai. *Fix:* shared `AdminPageHeader` component (back link + title + subtitle).
**L6.** `/joma` bottom nav-e nai — staff-der primary action drawer-er pichone lukano. *Fix:* role-aware bottom nav bibechona koro (staff-der jonno Profile-er bodle Joma).
**L7.** QR-er niche "স্ক্যান করে যাচাই করুন" er moto Bangla caption nai (`route.ts:361-375`) — user bujhbe na QR kiser jonno.
**L8.** Receipt preview iframe-e (`app/donations/page.tsx:124`) load-fail fallback text nai.
**L9.** Bulk-e expenses section-er icon `Trash2` — trash = delete connotation, misleading. `ReceiptText`/`Wallet` use koro.
**L10.** `money()` helper 3-ta file-e duplicate (joma:65, donations:19) — `lib/utils`-er `formatMoney` use koro (rounding inconsistent: `Math.round` vs none).
**L11.** Phone input-e `inputMode="tel"` nai (login/signup) — mobile-e numeric keyboard ashe na.
**L12.** Joma pledge toggle-e "ON"/"OFF" English (line 999) → "চালু"/"বন্ধ" likho.
**L13.** Joma success screen-e duitai `btn-emerald` ("রসিদ প্রিভিউ" + "নতুন জমা") — "নতুন জমা"-ke `btn-outline` koro; confirm dialog-er button (line 659/665) ad-hoc style → design-system class use koro.
**L14.** Member detail page-e mixed heading ("Payment History ও Member Ledger", line 109-110), method raw English, year Latin digit-e — Bangla koro + `methodLabels`/`toBengaliNumber` use koro.
**L15.** Donations empty state-e ("অথবা /joma থেকে নতুন জমা করুন") English route path + CTA button nai — `btn-emerald` "নতুন জমা করুন" link dao.

---

## 3. Improvement Plan (prioritized roadmap)

### Phase 1 — Trust & breakage (Week 1) 🔴
Goal: ja ekhon live user-der chokhe bhanga, ta thik kora.
1. `/verify/[receipt_no]` public page + middleware whitelist (C1) — printed receipt-er QR abar jibonto hobe
2. `X-Frame-Options: SAMEORIGIN` (H1) — receipt preview thik hobe
3. QR domain env-driven (H2) — bhabishyat-er domain change safe
4. Login `callbackUrl` support (H5) — deep link kaj korbe
5. Branded `not-found.tsx` + `error.tsx` (M1)

### Phase 2 — Data-entry hardening (Week 2) 🟠
Goal: bhul data dhoka bondho, admin-der kaj safe kora.
6. Bulk import UX: template download + confirm dialog + per-row error + 500-row cap (H4)
7. Expenses: `alert()` → inline banner, negative-amount validation (H7, H8)
8. Password visibility toggle (H9) + signup feedback/error-mapping (H10)
9. Joma: `inputMode="decimal"`, `<form>` wrap, combobox a11y, disabled-hint, focus trap (H11, M12)

### Phase 3 — Mobile & PWA polish (Week 3) 🟡
Goal: mobile-first experience ta shesh kora.
10. Safe-area fix (`pb-[env(safe-area-inset-bottom)]`), touch target 44px (M8, M9)
11. Drawer a11y: Escape + focus trap + aria (H6); bottom nav-e `aria-current` (M11)
12. Loading skeleton for list pages (M16); orphan `/admin/members/[id]` link ba remove (M10)
13. Service worker decision: offline caching enable, nahole PWA claim komao (M3)

### Phase 4 — Consistency & delight (Week 4) 🔵
Goal: "Bangla-first, polished" feel.
14. Bengali-first label sweep: reports/donations/expenses/member-detail-er English label (M4, M5, M7, L14)
15. Design-system migration: ad-hoc button → `btn-emerald`/`btn-outline` (M15); `.btn-rose` token dorkar hole define koro
16. HTML receipt view + print stylesheet (H3, M2); share flow verify-link-e (M17)
17. Manifest color match, dead token cleanup, footer `tel:` link (L1, L2, L4)
18. Aria-label sweep: shob icon-button-e `aria-label` (ekhon pura app-e **1-ta matro** ache)

---

## 4. Fix Plan (concrete ordered steps)

| # | Kaj | File | Estimate |
|---|---|---|---|
| 1 | `app/verify/[receipt_no]/page.tsx` banao (public, masked donor name, Bangla amount + kothay, invalid hole branded message) + `middleware.ts`-e `/verify/*` public koro | `app/verify/[receipt_no]/page.tsx`, `middleware.ts` | M |
| 2 | `X-Frame-Options: DENY` → `SAMEORIGIN` | `next.config.ts:20` | S |
| 3 | QR URL `NEXT_PUBLIC_APP_URL` env theke nao | `app/api/receipts/[id]/route.ts:366` | S |
| 4 | Login-e `callbackUrl` poro + same-origin check + redirect | `app/login/page.tsx:33` | S |
| 5 | `app/not-found.tsx` (Bangla branded) + `app/error.tsx` (retry button) | `app/` | S |
| 6 | Bulk import: template button + preview dialog + per-row error + 500 cap (API + UI) | `app/admin/bulk/page.tsx`, API route | L |
| 7 | Expenses: `alert()` → inline banner; `amount <= 0` validation + `min="0.01"` | `app/expenses/page.tsx` | S |
| 8 | Password Eye/EyeOff toggle (3 field) | `app/login/page.tsx`, `app/signup/page.tsx` | S |
| 9 | Signup: inline banner + error→Bangla map + phone regex + password hint | `app/signup/page.tsx` | M |
| 10 | Joma: `inputMode="decimal"`, `<form>` wrap, combobox aria, no-result message, disabled hint, dialog focus-trap/Escape | `app/joma/page.tsx` | M |
| 11 | Drawer a11y (Escape, focus trap, `role="dialog"`, `aria-modal`, `aria-expanded`, `aria-label`) | `components/layout.tsx` | M |
| 12 | Safe-area (`pb-[env(safe-area-inset-bottom)]`) + touch target 44px | `components/layout.tsx` | S |
| 13 | Nav-e `aria-current="page"`; orphan member-detail link ba remove | `components/layout.tsx`, `app/members/page.tsx` | S |
| 14 | List page skeleton rows (donations, expenses, members) | `app/donations/page.tsx` ityadi | M |
| 15 | Bengali-first sweep: reports/donations/expenses/member-detail label | `app/reports/page.tsx` ityadi | M |
| 16 | Ad-hoc button → `btn-emerald`/`btn-outline` migration | multiple pages | M |
| 17 | HTML receipt view + `@media print` stylesheet; share → verify link | `app/api/receipts/`, `app/globals.css` | L |
| 18 | Manifest color match (`#059669`/`#FDFDFC`), dead `--font-inter` token remove, footer `tel:` | `public/manifest.json`, `app/globals.css`, `app/page.tsx` | S |
| 19 | Icon-button `aria-label` sweep (pura app-e ekhon 1-ta) | multiple pages | S |
| 20 | SW decision: Workbox app-shell caching, nahole manifest theke offline claim sorano | `public/sw.js`, docs | M |

**Note:** AGENTS.md onujayi UI change-er sathe `docs/product/FEATURE_MAP.md` (notun `/verify` route), `CHANGELOG.md` [Unreleased], ar `COMMIT_LOG.md` update korte hobe — kintu ei review-te kono code change kora hoyni, tai doc update dorkar nai.

---

*Review method: tin-ta focused reviewer (navigation/IA, forms UX, receipts/verify) + nijer pass (design token, typography, PWA, layout shell, a11y scan). Shob finding code reference shoho, line number current checkout onujayi.*
