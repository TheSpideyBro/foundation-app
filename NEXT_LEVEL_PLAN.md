# Foundation App — Next-Level Plan (2026-10-03)

**Status quo:** v3 review done (41 findings: 1 High, 24 Medium, 16 Low, 0 Critical, no v2 regressions). DB layer hardened, build green, ledger engine verified. This plan is what to **execute starting tomorrow**, in dependency order.

**Standing blockers (not in phases — need Akash):**
- **Lipighor font licensing** (pre-deploy): permission email to `admin@lipighor.com` (+ footer backlink per foundry terms, previously declined). Unresolved — do not publicly deploy the 8 TTFs until handled.
- **Supabase management token** from the migration night: revoke if not done already.

---

## A. Next-level FEATURES

| # | Feature | User value | Data-model impact | Effort |
|---|---|---|---|---|
| F1 | **Member self-service portal** — "আমার হিসাব": own ledger, receipts, pledge status, arrears | Members stop asking the treasurer for their standing; transparency reduces disputes | None new — reuse `donations`, `payment_allocations`, `members` via existing RLS (own rows) + `security_invoker` views; one new member-safe summary RPC or view | M |
| F2 | **Offline-first PWA with sync** — collectors record জমা door-to-door without network; queue + auto-sync | Real collections happen where signal doesn't; no more paper-then-retype | Client outbox (IndexedDB) + idempotency key on `save_payment_entry` (new nullable column) to make retries safe | L |
| F3 | **Automatic receipt delivery (WhatsApp/SMS)** — text/PDF receipt sent on every জমা | Instant proof for donors; fewer "receipt হারিয়ে গেছে" cases | New `notifications` log table (recipient, channel, status); fix v2-L10 media 401 first | M |
| F4 | **Analytics dashboard** — collection-rate trends, defaulter/arrears list, collector performance, projections | Treasurer sees *where* money is leaking instead of guessing | New aggregate views/RPCs (monthly trends, arrears aging); no base-table changes | M |
| F5 | **Pledge reminders** — monthly WhatsApp nudge before due date; auto-advance pledge history | Fewer arrears, less manual chasing | `reminder_log` table + scheduled job (pg_cron or Vercel cron); reuses F3 delivery | M |
| F6 | **Expense OCR** — photo of a paper receipt → amount/category suggestion — **REMOVED per Akash 2026-10-02, not needed** | — | — | — |

**Recommended order:** F1 → F4 (read-only on existing data, no risky writes) → F3 → F5 (delivery channel once) → F2. (F6 Expense OCR removed per Akash 2026-10-02 — not needed. F7 gateway + F8 transparency page removed per Akash 2026-10-02 — not needed.)

---

## B. IMPROVEMENT plan (tech debt, perf, reliability, testing)

### Phase 1 — tomorrow-ready (with the v3 fixes)
1. **Fix v3 H1** (PDF Bengali tofu): embed Bengali TTF in jsPDF *or* remove the PDF button. Akash's call.
2. **Fix S-M1 + S-M2** (live DB): new migration — rewrite `enforce_member_self_update` guard (protected-fields-first) + `ON DELETE SET NULL` (or null-out) for the 4 `created_by` FKs in `admin_delete_user`. Write `BUG-###` entries first (repo convention), apply to Main via Management API in one transaction + `NOTIFY pgrst`, regenerate `supabase/schema.sql`, verify.
3. **UI Medium batch** (U-M1–U-M22 minus the big ones): `formatMoney` on profile (M1), `font-baloo` amounts (M2), contrast pass emerald-700/gray-500/darker gold (M3), sticky `top-16` (M4), 44px targets (M6), modal wrapper with Escape/trap (M7), `id`/`htmlFor` labels (M8), Bengali export labels (M9), print CSS shell hide (M10), joma method labels (M11), category label map (M12), `monthLabelBengali` + `methodLabels` on dashboard (M13/M14), "(ব্যাচ)" (M15), role labels (M16), `role="alert"` (M17), bulk picker keyboard (M18), landing CTAs/tel:/vendored texture (M19), `prefers-reduced-motion` (M20).
4. **Quick Lows:** `middleware.ts` → `proxy.ts` (U-L4), drop dead `touch-spacing` / decide `tailwindcss-animate` (U-L1/L2), members empty state (U-L6), drawer scroll-lock (U-L7), `th` padding (U-L12), Hind Siliguri fallback cleanup (U-L11), Baloo 900→bold (U-L10).
5. **WOFF2 conversion** (U-M21): convert the 4 Lipighor TTFs → WOFF2 (~65% smaller, ~417KB → ~145KB). Same filenames in `localFont` src.

### Phase 2 — hardening + scale
6. **Reports perf** (U-M22): move search filter after the heavy memo / debounce; then aggregate server-side (RPC) instead of 7×1000-row client fetches.
7. **PWA decision** (U-M5): real offline shell (cached app shell + Bengali offline page) **or** drop the no-op SW. (F2 offline-sync builds on this — decide now.)
8. **Rate limiting at the edge** (v2-L4, S-L2): move QR/member-QR throttling to verified client IP at the edge; keep in-app limiter as second layer.
9. **Test coverage:** Playwright e2e exists (`tests/e2e`) — add critical flows (joma → receipt → verify, bulk import, login/approval). Add API-route auth-gate tests (every route × role matrix).
10. **Small DB hygiene:** `get_my_role()` → NULL for anon (S-note); `auto-link` `is_approved` filter (S-L4); WhatsApp `Host` fallback removal (S-L3); route bulk-import donations through `save_payment_entry` or auto-backfill (S-L1).

### Phase 3 — platform
11. **Multi-foundation support** (org_id scoping) — only if a second foundation actually asks; it's a schema-wide change, don't pre-build.
12. **Observability:** error tracking (Sentry), slow-query alerts on Supabase, backup-restore drill for the sheets pipeline.
13. **Ledger BUG-022** (>120-month windows): unreachable today; fix only if the cap is ever lifted.

---

## C. UI optimisation — modern mobile-first redesign plan

### Design direction
**"bKash-familiar, premium-paper feel."** Akash's users are Bengali-speaking collectors and members on low-end Android phones. The premium receipt already established the visual language — **extend it app-wide** instead of inventing a new one:
- **Emerald (`#059669`/`#047857`) + gold (`#C9A227` decorative, `#7a5f14` for text)** on warm paper (`#FDFCF7`) — the receipt's identity becomes the app's identity.
- **Bottom-tab navigation on mobile** (ড্যাশবোর্ড · জমা · সদস্য · রিপোর্ট · প্রোফাইল) — thumb-reachable, the pattern every Bengali fintech user knows. Desktop keeps the sidebar.
- **Card-based lists everywhere** (members/donations/expenses already lean this way) — no dense tables on mobile; tables become desktop-only progressive enhancement.
- **Typography stays exactly as Akash approved it** — Shadhinata 2.0 headings, Abu J M Akkas body, Baloo Da 2 numerals, Alinur Nakkhatra details, Galada/Chayana Teesta accents. His eye is final; no new typefaces without his sign-off. (Licensing blocker still applies.)
- **Numerals:** Bengali digits everywhere user-facing (finish U-M1/U-L8); Latin digits only in mono IDs/receipt numbers.

### Screens to redesign (in order)
1. **Dashboard** — KPI cards become a horizontal snap-scroll strip; chart gets Bengali month labels (U-M13) + method labels (U-M14); recent-donations become tappable cards linking to receipts. *Depends on: U-M3 contrast, U-M6 targets.*
2. **Joma (জমা)** — the money screen. Convert to a 3-step stepper (সদস্য → টাকা/মাধ্যম → নিশ্চিত): keeps the allocation preview as the confirmation step (it's the killer feature — make it the hero, not a footnote). Fix method labels (U-M11), sticky header (U-M4), label association (U-M8). *Depends on: Phase 1 fixes.*
3. **Members** — directory cards with Bengali-digit phones, empty state (U-L6), 44px actions (U-M6), keyboard-safe modal (U-M7).
4. **Donations** — timeline grouping by month (Bengali month headers), inline receipt preview keeps backdrop-dismiss (U-M7), kill the inline `minHeight:0` override (U-M6).
5. **Verify (public)** — already good; add `aria` polish (done in v2), keep QR-first layout. This is the printed-receipt companion — don't restyle, only fix.
6. **Login/Signup** — keep; add `role="alert"` (U-M17), reduced-motion (U-M20).
7. **Admin suite** — bulk import gets the keyboard-operable picker (U-M18) + progress states; users page gets Bengali role badges (U-M16).
8. **Landing (`/`)** — mobile nav CTA (U-M19), `tel:` footer links, vendored texture; this is the public face — do it before any public launch.

### What NOT to do
- No letter-spacing on Bengali, ever (re-verified in v3 — keep the grep in CI).
- No new font families without Akash's explicit approval.
- No dark mode until the emerald/gold light identity is fully consistent (dark Bengali paper texture is a separate design project).
- Don't restyle the premium receipt — it's approved and done.

---

## Phasing & dependencies (the tomorrow plan)

| Phase | Contents | Depends on |
|---|---|---|
| **Phase 1 — tomorrow** | v3 H1 + S-M1/S-M2 (BUG entries → migration → apply → regen) + UI Medium/Low batch + WOFF2 | Nothing — start here |
| **Phase 2 — this week** | Reports perf, PWA offline decision, edge rate limiting, e2e coverage, small DB hygiene (S-L1–L4, anon NULL) | Phase 1 (contrast/targets/labels are prerequisites for the redesign) |
| **Phase 3 — later** | F1 self-service portal → F4 analytics (read-only features first) | Phase 2 (stable, tested base) |
| **Phase 4 — when needed** | F3/F5 delivery, F2 offline sync | Phase 3 + external approvals (SMS provider) |

**Redesign track** runs alongside: Phase 1 fixes → dashboard/joma/members/donations reskin (C) → verify/login/admin/landing polish. Never restyle the receipt.

**Suggested tomorrow kickoff order:** BUG entries for S-M1/S-M2 → H1 decision (fix PDF or drop button — ask Akash) → DB migration + apply → UI Medium batch in one pass → WOFF2 → commit/push/PR. That closes every v3 Medium in a day.
