# দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন — হিসাব খাতা

<p align="center">
  <img src="https://raw.githubusercontent.com/TheSpideyBro/foundation-app/dev/public/icons/icon-512.png" alt="Foundation Logo" width="120" />
</p>

<p align="center">
  <strong>দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশনের ডিজিটাল খাতা</strong><br/>
  <em>Digital ledger & fund management for a Bengali community welfare foundation</em>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase" alt="Supabase" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" /></a>
  <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" /></a>
</p>

<p align="center">
  <a href="https://github.com/TheSpideyBro/foundation-app/actions"><img src="https://img.shields.io/github/actions/workflow/status/TheSpideyBro/foundation-app/ci.yml?branch=dev&style=for-the-badge" alt="CI" /></a>
  <a href="https://github.com/TheSpideyBro/foundation-app/issues"><img src="https://img.shields.io/github/issues/TheSpideyBro/foundation-app?style=for-the-badge" alt="Issues" /></a>
  <a href="https://github.com/TheSpideyBro/foundation-app/blob/dev/LICENSE"><img src="https://img.shields.io/github/license/TheSpideyBro/foundation-app?style=for-the-badge" alt="License" /></a>
</p>

---

## ✨ What This App Does

| From | To |
|------|-----|
| 📓 Paper ledger book (খাতা) | 💻 Digital Joma Entry with live allocation preview |
| ✍️ Manual receipts | 🧾 Premium Bengali JPEG receipts with QR codes |
| 🧮 Mental math for totals | 📊 Automated dashboard + financial reports |
| 🗂️ Scattered phone records | 👥 Member directory with per-member ledger |
| 🤝 Word-of-mouth notices | 📢 Digital notice board |

**Key guarantee:** Every payment allocation is computed by a single canonical algorithm shared across TypeScript, SQL, and the UI — no parallel implementations. `SUM(payment_allocations) = SUM(donations)` is enforced after every write.

---

## 🚀 Quick Start

```bash
npm install
cp .env.example .env.local          # fill in Supabase URL + anon key
npm run dev
```

Full setup (Supabase schema, env vars, first admin account, deployment) → [SETUP.md](SETUP.md)

---

## 📚 Documentation System

| Topic | Link |
|-------|------|
| 🎯 Product vision & users | [docs/product/VISION.md](docs/product/VISION.md) |
| 🗺️ Feature map (all 26 screens) | [docs/product/FEATURE_MAP.md](docs/product/FEATURE_MAP.md) |
| 🏗️ System architecture | [docs/architecture/SYSTEM.md](docs/architecture/SYSTEM.md) |
| 💰 Accounting domain model | [docs/architecture/ACCOUNTING_DOMAIN.md](docs/architecture/ACCOUNTING_DOMAIN.md) |
| 🔄 Data flows (Mermaid diagrams) | [docs/architecture/DATA_FLOW.md](docs/architecture/DATA_FLOW.md) |
| 🔐 Security & auth model | [docs/architecture/SECURITY.md](docs/architecture/SECURITY.md) |
| 🗄️ Database schema & migration guide | [docs/database/SCHEMA.md](docs/database/MIGRATIONS.md) |
| 🧑‍💻 Contributing & dev guide | [docs/development/CONTRIBUTING.md](docs/development/CONTRIBUTING.md) |
| 👥 Roles & permissions matrix | [docs/development/ROLES.md](docs/development/ROLES.md) |
| 🤖 AI-agent engineering rules | [AGENTS.md](AGENTS.md) |
| 📜 Changelog | [CHANGELOG.md](CHANGELOG.md) |
| 🐞 Bugs / 🧠 Tech debt | [docs/decisions/BUGS.md](docs/decisions/BUGS.md) · [docs/decisions/TECH_DEBT.md](docs/decisions/TECH_DEBT.md) |
| 📐 Architecture Decision Records | [docs/decisions/ADRs/](docs/decisions/ADRs/) |
| 🕵️ Repository audit | [docs/audits/REPOSITORY_AUDIT.md](docs/audits/REPOSITORY_AUDIT.md) |
| 💬 WhatsApp Cloud API setup | [docs/development/WHATSAPP_SETUP.md](docs/development/WHATSAPP_SETUP.md) |
| 📊 Google Sheets backup setup | [docs/development/GOOGLE_SHEETS_SETUP.md](docs/development/GOOGLE_SHEETS_SETUP.md) |

---

## 📁 Directory Map

```
app/                     Next.js App Router (pages + API routes)
lib/                     Shared TS libs (payment-ledger, supabase, utils, integrations)
components/              React components (AuthProvider, layout shell, shadcn/ui)
supabase/migrations/     SQL migrations (chronological, applied to live DB)
tests/                   Allocation-engine unit tests (28 cases)
docs/                    Documentation system
reference/               Design reference files (full-app-design, receipt-design)
public/                  Static assets, Bengali fonts, PWA icons
```

---

## 🧪 Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build (standalone) |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run test:ledger` | **Canonical allocation engine tests** (28 cases) |
| `npm run test:e2e` | Playwright E2E (dashboard, reports) |

---

## 🛡️ Invariants (from [AGENTS.md](AGENTS.md))

1. **One allocation algorithm** — TypeScript (`lib/payment-ledger.ts`) and SQL (`calculate_payment_allocation`) MUST produce identical results. Change one, change the other.
2. **payment_allocations is source of truth** — all financial views derive from it.
3. **Service role key never on the client** — used only in `app/api/payments/route.ts` and admin routes.
4. **RLS uses `get_my_role()`** — not `auth.role()`.
5. **Zero-sum invariant** — `SUM(allocations) = SUM(donations)` verified after every write.

---

## 🌿 Branches

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready code |
| `dev` | Development branch (feature work) |

---

## 📄 License

See [LICENSE](LICENSE).