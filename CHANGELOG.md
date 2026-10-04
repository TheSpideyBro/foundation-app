# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/), and the project adheres to semantic versioning where relevant.

## 📅 Date line-up

- First commit: **2026-08-16**
- Latest: **2026-09-29**

---

## [Unreleased]

### Added
- **Premium receipt redesign — ornate Islamic style (2026-10-03)**: `components/ReceiptPaper.tsx` completely redesigned per Akash's reference image — dark emerald + gold on ivory with top arch (Islamic geometric SVG pattern + gold trim), mosque-dome shield logo, tagline "সেবা • সহায়তা • মানবিকতা", large foundation name, contact row, light-green receipt_no/date pill, dark-green "সর্বমোট প্রাপ্তি" badge, huge amount display, dashed detail rows, Galada gratitude, QR + signature, ornamental bottom corners. No letter-spacing on Bengali.
- **WhatsApp direct receipt share (2026-10-03)**: new `components/WhatsAppShareButton.tsx` — downloads the receipt JPEG to the gallery then opens `wa.me` directly to the member's chat with a pre-filled Bengali message (foundation header, greeting, receipt_no, month/coverage period, amount, gratitude). The user taps attach → recent images → sends. Added to donation cards and the receipt page action bar (green WhatsApp icon). Browsers cannot programmatically attach images to WhatsApp chats, so this download-then-open flow is the closest achievable UX. **Update:** F3 manual resend button removed from donation cards (direct share covers the use case); message polished per Akash (month included, "gallery attach" line removed).
- **Member ID — সদস্য আইডি (2026-10-03)**: new `member_code` column on `members` (TEXT, unique, nullable) holding the Excel-based member ID (1–44). Migration `supabase/migrations/20261003_member_code.sql` **applied live 2026-10-03**; all 44 members backfilled with their Excel IDs. Members page shows `#ID` badge next to each name; add/edit form includes সদস্য আইডি field.
- **Report system simplification (2026-10-03)**: `/reports` page deleted (duplicate tabs eliminated). Excel/CSV export moved to Donations and Expenses pages via new `lib/export.ts`. Analytics KPI cards removed (duplicated Dashboard). PDF export dropped (Bengali tofu bug).
- **Bank/Cash Accounts — ব্যাংক/ক্যাশ হিসাব (2026-10-03)**: new staff-only feature for tracking foundation bank accounts and cash-in-hand separately. New `/accounts` route (account cards with live balances) + `/accounts/[id]` (statement with running balances). Staff can create bank/cash accounts with opening balances and record জমা (in) / খরচ (out) / ট্রান্সফার (paired atomic rows) via `POST /api/accounts/[id]/transactions`. Migration `supabase/migrations/20261003_bank_cash_accounts.sql` (`accounts`, `account_transactions`, `account_balances` view, staff RLS) **applied live 2026-10-03** — premises verified, 4 policies green. Sidebar nav: "ব্যাংক/ক্যাশ" (Landmark icon).
- **F2 Offline-first sync (2026-10-02)**: joma entry now works without internet — payments are saved to a local IndexedDB outbox (`lib/offline-queue.ts`) with status "pending" and the form shows "অফলাইনে সংরক্ষিত". A sync engine (`lib/sync-engine.ts`) replays queued payments FIFO via `POST /api/payments` when connectivity returns (on `online` event, app start, every 5 min, or manual "এখনই সিঙ্ক করুন"). Duplicate receipt_no on replay is treated as already-synced. A floating `OfflineIndicator` (`components/OfflineIndicator.tsx`) shows অনলাইন/অফলাইন status + pending count, with a queue list and discard option. No DB migration — purely client-side.
- **F5 Pledge reminders — WhatsApp (2026-10-02)**: automatic monthly reminder on the 5th (Vercel Cron → `GET /api/cron/pledge-reminders`, secured by `CRON_SECRET`) for active members whose previous-month pledge is still unpaid — skips members already reminded that month and those without phone/WhatsApp config. New `reminder_log` table (`supabase/migrations/20261002_f5_reminder_log.sql`, staff SELECT/INSERT RLS) + `lib/reminder-notify.ts` sender (reuses F3's WhatsApp plumbing). Staff can also send a manual reminder per defaulter from the analytics বকেয়া তালিকা (`POST /api/notify/reminder`, staff-only) with a "পাঠানো" badge once sent. Migration **applied live 2026-10-02 ~14:25 +06** (premise re-verified, post-apply checks green).
- **F3 Automatic receipt delivery — WhatsApp (2026-10-02)**: every জমা now auto-sends a Bengali WhatsApp receipt (amount/date/receipt_no + public verify link) to the member's phone via the Meta Cloud API; skips gracefully without a phone number or WhatsApp config, and never blocks the payment. New `lib/receipt-notify.ts` shared sender + `notifications` log table (`supabase/migrations/20261002_f3_notifications.sql`, **applied live 2026-10-02 ~12:10 +06** — premises re-verified, post-apply checks green). Joma confirm dialog has a "WhatsApp-এ রসিদ পাঠান" checkbox (default on); success screen + donation cards show delivery status ("পাঠানো" badge) with a staff-only resend button. `POST /api/notify/whatsapp` refactored onto the shared sender (still staff-authenticated).
- **F4 Analytics dashboard (2026-10-02)**: new staff-only `/analytics` route — collection-rate trends (12-month expected vs collected bar chart), KPI cards (this month's collection %, total arrears, active members, avg monthly), defaulter/arrears list (months behind, sorted by amount), collector performance leaderboard, and annual projection from the 6-month run rate. Client-side aggregation over `payment_allocations` (pledge+advance = paid, canonical) — no DB migration needed, no base-table changes.
- **Receipt JPEG share/download + mobile scroll fixes (2026-10-02)**: share now sends the premium receipt as a **JPG image** (native share sheet) and download saves a **JPEG file** — no more link-share or print-tab download. `components/ReceiptJpegButton.tsx` fetches the image from `GET /api/receipt-image`, which renders the shared `ReceiptPaper` server-side with headless Chromium (screenshot of the token-authenticated `/receipt-shot/[id]` page); receipt prop-building extracted to `lib/receipt-props.ts` (single source of truth for the receipt page + JPEG export, incl. batch consolidation). Wired into donation cards, joma success screen, and the receipt page action bar. Also fixed mobile scrolling: removed `overflow-x-hidden` from the layout root (it turned the div into the scroll container, making the fixed bottom nav jump on scroll and cutting page view on mobile) — horizontal clipping now via `overflow-x: clip` on `html/body`, which keeps `position:fixed` working.
- **F1 Member self-service portal — "আমার হিসাব" (`/amar-hisab`, 2026-10-02)**: members see their own account — summary cards (monthly pledge, total paid, arrears, payment rate), month-by-month ledger (Bengali months, status badges) built with the canonical `buildMemberLedgerFromAllocations`, payment history with premium-receipt links, profile edit (name/phone/address; pledge/status locked by DB trigger), latest notices. Nav: sidebar "আমার হিসাব" + mobile bottom-tab "হিসাব" (replaces হোম) for the member role. RLS migration `supabase/migrations/20261002_member_portal_rls.sql` (`payment_allocations_select_own` + `pledge_history_select_own`) **applied live 2026-10-02 ~11:50 +06** (premises re-verified at apply time, post-apply checks green); `supabase/schema.sql` regenerated, SCHEMA.md row 20 marked APPLIED.

### Fixed
- **WhatsApp share receipt download broken on repeat clicks (2026-10-04, BUG-047)**: regression from the previous day's share hardening — the prefetched receipt blob was never consumed, so the 2nd click onward reused an already-revoked object URL and the image silently stopped landing in the gallery (nothing to attach in WhatsApp). The cache is now cleared after each use (same pattern as the receipt share button), and `window.open` is null-checked with a same-tab `wa.me` fallback so popup blockers can't swallow the member's chat.
- **Donation-page receipt delivery review (2026-10-04, BUG-046)**: donation cards now show the F3 WhatsApp delivery status ("পাঠানো হয়েছে" / "ব্যর্থ" + error tooltip / "বাদ") read from the `notifications` log; the WhatsApp Cloud API now receives E.164-normalized numbers server-side (`lib/whatsapp.ts` via shared `normalizePhone()`) — before, member phones stored as `017…` were sent to Meta as 11-digit national numbers and auto-sends failed while manual testing through the client button (which had its own normalizer) looked fine; the direct WhatsApp share button now prefetches the receipt JPEG on hover/touch (avoids losing the Android user gesture during the slow puppeteer render), falls back to opening the image in a new tab on iOS Safari (the `download` attribute is ignored there, so the image never reached the gallery), waits 300 ms so the download lands before `wa.me` opens, and includes the receipt verify link in the message. Phone normalization, receipt filename building and verify-URL construction were deduplicated into `lib/utils.ts` (3 divergent inline copies before).
- **Receipt JPEG white-image bug (2026-10-02)**: share/download produced a fully white JPG on iOS Safari — client-side `html-to-image` (SVG foreignObject rasterization) silently fails there: the canvas keeps only the background fill when `drawImage` draws nothing. Replaced with **server-side rendering**: `GET /api/receipt-image?donationId=` (staff any receipt, members own receipts via RLS) renders the premium receipt with headless Chromium (`@sparticuz/chromium-min` + `puppeteer-core`, new deps; `html-to-image` removed) by screenshotting the token-authenticated `/receipt-shot/[id]` page (5-min HMAC token via `lib/receipt-shot-token.ts`, no app chrome, `robots` noindex) and returns real JPEG bytes — identical output on every client. `ReceiptJpegButton` now just fetches the image and shares/downloads it. Added `requireUser()` to `lib/server-auth.ts` (any approved authenticated user) for the member-own fallback. **Follow-up fix same day**: the API 500'd in production ("রসিদের ছবি তৈরি করা যায়নি") — two causes found: (1) puppeteer's default `headless:true` (new headless mode) conflicts with sparticuz's headless-shell-only binary → now `headless: "shell"`; (2) Next.js bundled `@sparticuz/chromium`, breaking its relative `bin/` path resolution at runtime → now in `serverExternalPackages` (per its README "Bundler Configuration"). **Further hardened same day**: switched to `@sparticuz/chromium-min` + the GitHub release pack URL — the binary downloads/extracts to `/tmp` at runtime, so zero binary files are needed in the deployment (no bundler/tracing doubt at all) and the deployment stays small.
- **Review v3 fixes (2026-10-02, H1/S-L1–S-L4/U-M1–U-M22/U-L1–U-L12)** — third full review round, 41 findings, zero v2 regressions (tsc/eslint/build/test:ledger 28/28 all green):
  - **H1**: reports PDF export now embeds a Bengali TTF into jsPDF (`addFileToVFS`/`addFont`) — Bengali no longer renders as tofu; header localized to Bengali. Known jsPDF limitation: no complex-text shaping, so conjuncts render unshaped (still legible, infinitely better than tofu).
  - **S-L1**: bulk import and sheets-restore now run `backfill_payment_allocations()` afterward (idempotent; failures surfaced as `backfillWarning`/`result.errors`), so the zero-sum invariant holds without a manual backfill.
  - **S-L2**: `/api/members/[id]/qr` rate-limited (60/min, same pattern as `/api/qr`).
  - **S-L3**: WhatsApp verify-link no longer falls back to the `Host` header — fail-closed 500 without `NEXT_PUBLIC_SITE_URL`.
  - **S-L4**: auto-link only links `is_approved = true` accounts.
  - **UI batch**: profile amounts via `formatMoney`; amounts in `font-baloo`; contrast fixes (`emerald-700`/`gray-500` small text, darker `#7a5f14` receipt gold); sticky headers offset below the mobile app bar (`top-16`); 44px touch targets; new shared `components/Modal.tsx` (Escape, focus trap/restore, backdrop close) adopted by members/profile/donations modals; `id`/`htmlFor` labels + search `aria-label`s; Bengali export labels; print CSS hides the app shell; distinct Bengali joma method labels (ক্যাশ/বিকাশ/নগদ/ব্যাংক — stored values unchanged); Bengali expense categories/months/methods; `(ব্যাচ)`; Bengali role badges (প্রশাসক/কোষাধ্যক্ষ/সদস্য); `role="alert"`/`role="status"` on auth feedback; keyboard-operable bulk file picker; landing mobile CTA + `tel:` links + vendored texture; `prefers-reduced-motion`; WOFF2 fonts (~58% smaller: 418KB → 177KB); reports search no longer recomputes member ledgers per keystroke.
  - **Lows**: `middleware.ts` → `proxy.ts` (Next 16 convention); manifest `orientation: "any"`; members empty state; drawer body scroll-lock; Bengali phone digits on member lists; Bengali copy cleanups; `font-bold` instead of unloaded `font-black`; Hind Siliguri dropped from CSS fallback stacks; report `<th>` padding; dead `animate-in` classes removed; `.touch-spacing` defined.
  - **New**: `/offline` fallback page (Bengali, inline styles only) — the service worker caches it on install and serves it for failed navigations, so the installed PWA no longer shows a dead page offline.
- **Receipt routing (2026-10-02, user-reported)**: donation-page প্রিভিউ/ডাউনলোড/শেয়ার — and the joma success screen + admin member ledger — served the legacy JPEG (`/api/receipts/[id]`) while রসিদ দেখুন showed the new premium receipt. Now: preview iframes the new receipt (`/donations/[id]/receipt?embed=1`, shell hidden); download opens the new receipt with auto-print (`?print=1`) so it saves as PDF; share sends the public verify link (JPEG blob fetch removed). The legacy JPEG generator is left in place but no longer linked from any page.
- **DB (applied live 2026-10-02 ~11:40 +06)**: BUG-042 (`enforce_member_self_update` early-return bypass) and BUG-043 (`admin_delete_user` 409s on FK constraints) are now **fixed**; migration `supabase/migrations/20261003_review_v3_db_fixes.sql` applied to Main via Management API (premises re-verified live at apply time, post-apply checks green — protected-check-first body, trigger attached, zero-sum holds), `supabase/schema.sql` regenerated from live.
- **Review v2 fixes (2026-10-02, C1/H1/M1–M9/L1–L3/L6–L20)** — second full review round, 31 findings:
  - **DB hardening** (`supabase/migrations/20261002_review_v2_db_hardening.sql`, ✅ **applied to live Main DB 2026-10-02 ~02:45 +06** via Management API in a single transaction + `NOTIFY pgrst` reload; all 5 premises re-verified against the live catalog at apply time, 10/10 post-apply checks green, `supabase/schema.sql` regenerated from live): founder-email bypass removed from `admin_delete_user` (guard is now `get_my_role() <> 'admin'`); all 6 financial/member views set to `security_invoker = true` so base-table RLS applies (members no longer see foundation-wide totals or others' `monthly_pledge`); `calculate_payment_allocation` revoked from `authenticated` (pledge oracle closed); `log_audit_event` no longer misattributes service-role writes to a random admin (actor NULL + `system@foundation.app`); `generate_receipt_no` anon grant revoked. Read-only pre-migration Supabase audit (`SUPABASE_AUDIT_2026-10-02.md`) gave a conditional GO; the dump script now also emits per-view `security_invoker` status so regenerations stay faithful.
- **Supabase audit follow-up hygiene (2026-10-02, L-A1/L-A2/L-A3)** — `supabase/migrations/20261002_audit_followup_hygiene.sql`, ✅ **applied to live Main DB ~02:55 +06** (premises re-verified live, post-apply checks green incl. a rolled-back INSERT proving the triggers still fire; `supabase/schema.sql` regenerated): the 5 trigger functions (`handle_new_user`, `log_audit_event`, `set_donation_month`, `set_receipt_no`, `enforce_member_self_update`) are no longer directly RPC-callable by anon/authenticated (only postgres + service_role keep EXECUTE — trigger firing needs no grant); meaningless INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER grants removed from the 6 views for anon/authenticated (SELECT untouched); `SET search_path = public` pinned on `set_donation_month`/`set_receipt_no`.
  - **App code**: `POST /api/admin/reset-password` now writes an audit-log row and refuses to reset a fellow admin's password; `restore-sheets`/`sync-sheets` POST check admin auth *before* the Sheets config check (config oracle closed); `restoreFromSheets` no longer writes the removed `members.user_id` column, surfaces write errors, guards NaN pledges; verify page brand name uses precomposed ড় (was decomposed ড+়); headings default to `font-shadhinata` via the base rule; `month` param validated in pending-pledges; `receipt_no` sanitized in Content-Disposition; receipts API authorizes before fetching; explicit `.limit()` on reports/dashboard/pending queries; member QR route requires `NEXT_PUBLIC_SITE_URL` (no stale fallback); WhatsApp sends the public verify link as text instead of an auth-walled media URL (was always 401); dead duplicate blocks removed from receipt page; `.table-header` tracking trap removed; unused Hind Siliguri font import dropped; receipt footer contrast raised to AA; redundant login inline style removed; verify-page emojis aria-hidden; `maskName` uses `Intl.Segmenter` graphemes; `apple-touch-icon` added; "নগদ (Nagad)" → "নগদ".
  - Accepted as-is (documented in TECH_DEBT.md TD-012): in-app QR rate limiter stays a second layer (edge limiting unavailable), sequential receipt numbers remain enumerable by design, synthetic bold on Lipighor Regular cuts accepted.
- **AppLayout shell font (2026-10-02)**: the authenticated app shell still used `font-hind` — now `font-akkas` (Li Abu J M Akkas) like the rest of the app.
- **Full-repo review fixes (2026-10-02, H2/M1–M4/L1–L11)**: legacy batch receipt coerces amounts with `Number()` (string-concat totals like `৳ 0500300/-` impossible); `receipt_no` is URL-encoded in every verify URL (HTML receipt QR, legacy JPEG QR, donations share link); `/verify` is batch-aware — scanning a batch receipt's QR now shows a batch box with the batch total + month range so it matches the printed paper; `/api/qr` returns `422` JSON instead of a raw 500 on encode failure and has a light rate limit (60 renders/min per IP); the receipt QR URL is built after mount (no hydration flicker); unused Anek Bangla + Sabbir Sorolota font declarations removed (Sabbir TTFs deleted); unused italic `@font-face` entries dropped; batch receipts keep the full number (`FHF-2026-0001 (Batch)`); batch queries are guarded by `member_id` and the month label counts unique months; legacy QR prefers the request origin; the HTML receipt restores legacy parity so members can view their own receipts (staff OR owner, RLS still enforced); `metadataBase`/openGraph honor `NEXT_PUBLIC_SITE_URL`; dead `text-md` class fixed to `text-base`.

### Added
- **Joma Entry auto-splits the cash handed over** — the জমা field is now the *total* (মোট নগদ): whatever the coverage window cannot absorb is derived as অতিরিক্ত জমা (read-only box, never typed) and sent as `extra_amount`, so `amount` = what the engine may allocate, `donations.amount` still equals the cash handed over and the zero-sum invariant is untouched. Before, the operator had to compute and type the split by hand — a ৳1,400 entry over a ৳1,300 window left ৳100 as an anonymous "অবণ্টিত" row with `extra_amount = 0`. Preview, confirm dialog, success screen and receipt now show the same three numbers (মোট নগদ / বরাদ্দ / অতিরিক্ত জমা), the amber "⚠ অবণ্টিত" warning became a normal extra-amount line, and the receipt/donation labels are Bengali instead of "Extra Amount"/"extra".
- `scripts/dump-supabase-schema.py`: regenerates `supabase/schema.sql` as executable DDL from the live catalog (tables, constraints, FKs, indexes, RLS, verbatim policies/functions with their EXECUTE grants, triggers, views, grants) — the hand-written file had drifted badly (TD-008).
- `supabase/migrations-test/`: separate migration folder for the Test project — its `save_payment_entry`/`reallocate_payment` signatures differ from Main, so replaying Main's files there would create broken overloads (TD-011).
- **Receipt verification (public)**: new `/verify/[receipt_no]` page — the QR code printed on every receipt now resolves to a branded "যাচাইকৃত রসিদ" check (masked donor name, amount in Bengali digits + words, month, date, collector); unknown numbers get a branded "রসিদ পাওয়া যায়নি" card. Whitelisted in `proxy.ts`.
- **HTML receipt view**: new staff-gated `/donations/[id]/receipt` page — accessible alternative to the JPEG receipt (screen-reader readable, copyable text) with a print button and scoped `@media print` stylesheet.
- **Bulk import UX**: per-section template download, file validation (5 MB cap, extension/MIME), parse preview (Bengali row count + first-5-rows table) with a "নিশ্চিত করুন" confirm step before POST, 500-row cap, per-row `{row, error}` reporting, progress text with `role="status"`.
- **Auth UX**: login honors `?callbackUrl=` (same-origin validated); password visibility toggles on all three password fields; signup uses inline Bengali banners (no more `alert()`), maps Supabase errors to Bengali, validates phone `^01[3-9]\d{8}$`, shows the 6-char password hint; `inputMode="tel"` on phone inputs.
- **App shell a11y**: mobile drawer with Escape-to-close, focus trap, `role="dialog"`/`aria-modal`; `aria-current="page"` on nav; branded Bengali `not-found.tsx` + `error.tsx` (retry); safe-area padding; 44px touch targets; role-aware bottom nav (staff see "জমা"); shared `AdminBackLink` component.
- **Bengali-first sweep**: reports/donations/expenses/members/member-detail labels, dates (`formatDateBengali`), numerals (`toBengaliNumber`/`formatMoney`), and methods (`methodLabels`) — no more "Cash Received"/"Search..."/raw ISO dates.
- List pages (donations, expenses, members) show skeleton rows while loading instead of bare spinners.

### Changed
- **Premium receipt redesign**: the staff HTML receipt (`/donations/[id]/receipt`) is rebuilt as an editorial "paper" receipt — ivory paper on a dark stage, emerald (`#022C22`/`#064E3B`) + gold (`#C9A227`) brand bands, Landmark masthead, large Bengali amount hero with কথায় amount, receipt-no/date band, donor/month/method/collector rows, gratitude + signature/seal areas, and a QR verification card. The QR is now a same-origin PNG from the new `GET /api/qr?text=...` endpoint (input capped at 512 chars, text only encoded — never fetched, no SSRF surface). Print CSS hides the toolbar, drops the stage background, and keeps exact colors. All data behavior (batch consolidation, staff gate, loading/error states) is unchanged; the presentational markup lives in `app/donations/[id]/receipt/ReceiptPaper.tsx`. Feedback round: headings/amount now use **Baloo Da 2** and the gratitude line uses **Galada** (new `--font-baloo`/`--font-galada` theme tokens); the "দান রসিদ" eyebrow's over-wide letter-spacing is fixed; the raw verify URL beside the QR is removed; the paper is tightened (smaller masthead, 42–50px amount hero, 88px QR, reduced paddings) to fit with minimal scrolling. Letterhead contacts: foundation address (দৌলখাঁড় পূর্বপাড়া, নাঙ্গলকোট, কুমিল্লা) and phone numbers (০১৮৪০-৮২৮০১০ · ০১৮১৪-৯৪৮২২৪) taken from the legacy JPEG receipt now appear under the masthead with MapPin/Phone icons. Details rows (প্রদানকারী, মাসের নাম, etc.) now use **Anek Bangla** (new `--font-anek` token) for a more stylish data look. Collector name now sits on the signature line in Galada script (signature style) instead of plain text below the label. Office seal block removed; signature name pulled tighter to the signature line (-mb-4). QR verification card and collector signature now sit side-by-side (stacked on narrow screens); overall vertical rhythm tightened further (smaller paddings/margins throughout). Masthead now uses Akash's custom **Li Sabbir Sorolota** font (Unicode TTFs in `app/fonts/`, loaded via `next/font/local` as `--font-sabbir`); bold removed since the font ships a single 400 weight (synthetic bold distorts Bengali conjuncts), size bumped to 26/30px to keep presence. Straight font swap per feedback: masthead back to 23/26px + font-bold with font-sabbir only (no size/weight tweaks). Masthead color changed from deep emerald (#022C22) to pure black per feedback. Bottom row per sketch: QR pushed left, signature pushed right (justify-between, bottom-aligned); QR card chrome removed for a minimal look. QR/signature row is now always side-by-side (the <420px stacking breakpoint is removed — signature flexes, QR stays fixed). Signature name (collector) reduced from 26px to 20px per feedback. Detail rows (প্রদানকারী, মাসের নাম, মাধ্যম, আদায়কারী) now use Akash's **Li Alinur Nakkhatra** font instead of Anek Bangla (Unicode TTFs in `app/fonts/`, loaded via `next/font/local` as `--font-nakkhatra`, Anek Bangla kept as fallback). **Li Abu J M Akkas** is now the default body font (replaces Hind Siliguri; Unicode TTFs in `app/fonts/`, loaded via `next/font/local` as `--font-akkas`, Hind Siliguri kept as fallback). Detail rows bumped up: labels 11px → 12px, values 15px → 17px. Masthead now uses Akash's **Li Shadhinata 2.0** font instead of Sabbir Sorolota (Unicode TTFs in `app/fonts/`, loaded via `next/font/local` as `--font-shadhinata`, Baloo Da 2 as fallback) — straight swap, size/color unchanged. Gratitude line (জাযাকাল্লাহু খাইরান) and collector signature name now use Akash's **Li Chayana Teesta** font instead of Galada (Unicode TTFs in `app/fonts/`, loaded via `next/font/local` as `--font-teesta`, Tiro Bangla as fallback) — straight swap, sizes unchanged. Gratitude line (জাযাকাল্লাহু খাইরান) reverted to **Galada** per feedback — signature name keeps **Li Chayana Teesta**; the two are now different on purpose. Custom Lipighor fonts now applied across the full app by role: **Li Shadhinata 2.0** for all page headings and brand names (replaces Tiro Bangla on h1/h2/h3, nav/sidebar brand, footer, auth headers); **Li Abu J M Akkas** is now the true default body font (`font-hind` → `font-akkas` on `<body>` and on receipt/verify/error/not-found wrappers — previously the `font-hind` utility class was overriding the CSS body rule); **Baloo Da 2** for amount/stat numbers (dashboard stats, net balance, member count, pledges, dues); **Li Alinur Nakkhatra** for the verify page's detail rows. The receipt's italic quote keeps Tiro Bangla on purpose.

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