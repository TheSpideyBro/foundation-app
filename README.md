# দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন — হিসাব খাতা

Fund-management web app for the Daulkhandar Purbarpara Hilful Fuyul Foundation (a Bengali community welfare foundation). Digital "khata" (ledger) for tracking member monthly pledges (chada), donations, expenses, receipts, and financial reports — entirely in Bengali with a ledger-book visual identity.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (PostgreSQL + Auth + RLS) · PWA

---

## Quick Links

| Topic | Where |
|-------|-------|
| 🚀 Setup & first admin | [SETUP.md](SETUP.md) |
| 🧭 Product vision | [docs/product/VISION.md](docs/product/VISION.md) |
| 🗺️ Feature map | [docs/product/FEATURE_MAP.md](docs/product/FEATURE_MAP.md) |
| 🏗️ System architecture | [docs/architecture/SYSTEM.md](docs/architecture/SYSTEM.md) |
| 💰 Accounting domain (canonical allocation) | [docs/architecture/ACCOUNTING_DOMAIN.md](docs/architecture/ACCOUNTING_DOMAIN.md) |
| 🔐 Security model | [docs/architecture/SECURITY.md](docs/architecture/SECURITY.md) |
| 🗄️ Database schema | [docs/database/SCHEMA.md](docs/database/SCHEMA.md) |
| 🧮 Migration guide | [docs/database/MIGRATIONS.md](docs/database/MIGRATIONS.md) |
| 🧑‍💻 Contributing & dev guide | [docs/development/CONTRIBUTING.md](docs/development/CONTRIBUTING.md) |
| 💬 WhatsApp setup | [docs/development/WHATSAPP_SETUP.md](docs/development/WHATSAPP_SETUP.md) |
| 📊 Google Sheets backup setup | [docs/development/GOOGLE_SHEETS_SETUP.md](docs/development/GOOGLE_SHEETS_SETUP.md) |
| 👥 Roles & permissions | [docs/development/ROLES.md](docs/development/ROLES.md) |
| 🤖 AI-agent instructions | [AGENTS.md](AGENTS.md) |
| 📰 Changelog | [CHANGELOG.md](CHANGELOG.md) |
| 🐞 Bugs / 🧠 Tech debt | [docs/decisions/BUGS.md](docs/decisions/BUGS.md) · [docs/decisions/TECH_DEBT.md](docs/decisions/TECH_DEBT.md) |
| 📐 ADRs | [docs/decisions/ADRs/](docs/decisions/ADRs/) |

---

## Highlights

- **Canonical payment allocation** — one algorithm shared by TypeScript, SQL, UI preview, and reports; `payment_allocations` is the single source of truth. Zero-sum invariant `SUM(allocations) = SUM(donations)` holds.
- **Premium Bengali receipts** — server-rendered JPEG receipts with QR verification, signature font, and amount-in-words.
- **Joma Entry with live preview** — see exactly how a payment splits across months before saving.
- **Role-based access** — admin / treasurer / member, enforced at UI, API, and RLS layers.
- **Integrations** — WhatsApp Cloud API donation alerts, Google Sheets auto-backup.
- **PWA** — installable, offline-capable shell for low-bandwidth mobile users.

---

## Quick Start

```bash
npm install
cp .env.example .env.local      # fill in Supabase URL + anon key
npm run dev
```

Full setup (Supabase schema, env vars, first admin account, deployment) is in [SETUP.md](SETUP.md).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build (standalone) |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run test:ledger` | Canonical allocation engine tests (28 cases) |
| `npm run test:e2e` | Playwright E2E (dashboard, reports) |

---

## Directory Map

```
app/                     Next.js App Router (pages + API routes)
lib/                     Shared TS libs (payment-ledger, supabase, utils, integrations)
components/              React components (AuthProvider, layout shell, shadcn/ui)
supabase/migrations/     SQL migrations (chronological)
supabase/schema.sql      Full database schema reference
tests/                   Allocation-engine unit tests
docs/                    Documentation system
public/                  Static assets, Bengali fonts, PWA
```

## License

See [LICENSE](LICENSE).