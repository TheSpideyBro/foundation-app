# Contributing to Foundation App

Thank you for your interest in contributing to **দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন — Fund Management App**!

## Code of Conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## 🚀 Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/TheSpideyBro/foundation-app.git
cd "foundation app"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
cp .env.example .env.local
# Fill in your Supabase URL and anon key in .env.local
```

### 4. Run Locally

```bash
npm run dev
# Opens at http://localhost:3001
```

---

## 📋 Development Guidelines

### Coding Standards

- **Language**: All code must be in **TypeScript** (`.ts` / `.tsx`). No `.js` files in `app/`, `components/`, or `lib/`.
- **Styling**: Follow the [Design System](./README.md#-ডিজাইন-সিস্টেম). Never invent new colours — use the palette from `app/globals.css`.
- **Components**: Use shadcn/ui (`@/components/ui/*`) for primitives. Build composites in `components/`.
- **Fonts**: Bangla body → `Hind Siliguri`, Headings → `Tiro Bangla`, Numbers → `JetBrains Mono`.
- **Formatting**: Use `npm run lint` before committing. ESLint config is in `eslint.config.mjs`.

### Git Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/add-monthly-summary
   # or
   git checkout -b fix/rls-donation-insert
   ```
2. Make your changes.
3. Run lint & tests:
   ```bash
   npm run lint
   npm run test:verify
   ```
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(donations): add pdf receipt download
   fix(expenses): repair rls policy for image upload
   chore: update package-lock
   ```
5. Push and open a Pull Request.

### Branch Naming

| Prefix | Use case |
|---|---|
| `feat/…` | New feature |
| `fix/…` | Bug fix |
| `docs/…` | Documentation changes |
| `chore/…` | Build, config, tooling |
| `refactor/…` | Code restructure (no behaviour change) |
| `test/…` | Adding or updating tests |

---

## 🧪 Testing

```bash
# Run E2E tests (requires a running server on port 3001)
npm run test:e2e

# Run the full verify suite (build + start + E2E)
npm run test:verify
```

### Writing Tests

- E2E tests go in `tests/` and `e2e-*.js`.
- Use Playwright assertions (`expect`, `toBeVisible`, `toHaveText`).
- Keep tests fast — mock auth where possible.

---

## 📐 Architecture Notes

### Auth Flow

1. `AuthProvider` (in `components/providers.tsx`) resolves session on mount.
2. It bootstraps the `users` profile row if missing (`ensureProfile`).
3. Role is resolved from the `users` table (`resolveRole`).
4. `middleware.ts` enforces authentication for all non-public routes.

### Database

- Schema: `supabase-schema.sql` (run once on a fresh project).
- Migrations are in `migration-phase*.sql` and `fix-rls-policies-v*.sql`.
- Audit log: `migration-phase1.sql` adds `audit_log` table + `log_audit_event()` RPC.

### PWA

- `public/sw.js` — service worker (cache-first for static, network-first for pages).
- `public/manifest.json` — app manifest with Bengali metadata.
- Icons in `public/icons/` (192px + 512px).

### Design System

Always refer to [`CLAUDE.md`](./CLAUDE.md) before building or modifying any UI. The reference designs are in `reference/`.

---

## 🐛 Reporting Bugs

1. Search [existing issues](../../issues) first.
2. If new, open an issue with:
   - **Steps to reproduce**
   - **Expected vs actual behaviour**
   - **Environment** (browser, OS, node version)
   - **Screenshots** if applicable

---

## 💡 Suggesting Features

1. Open an issue with the `enhancement` label.
2. Describe the use case in Bangla context.
3. Link to any relevant design references.

---

## 🔍 Code Review Checklist

Before submitting a PR, ensure:

- [ ] `npm run lint` passes with zero errors
- [ ] All new code has TypeScript types (no `any`)
- [ ] Bengali UI strings use `toBengaliNumber()` / `formatMoney()` where appropriate
- [ ] No hardcoded colours — use design system tokens from `globals.css`
- [ ] RLS policies are updated if new tables/columns are added
- [ ] `.env.local` is NOT committed
- [ ] E2E tests pass (if applicable)

---

## 📄 License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
