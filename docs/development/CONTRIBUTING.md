# Development Guide

## Prerequisites

- Node.js 18+ (recommended: 20+)
- pnpm (package manager)
- Git
- Supabase account (for live database)
- Google Cloud Service Account (for Sheets sync, optional)
- WhatsApp Cloud API token (for notifications, optional)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd "Foundation App"
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   NEXT_SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

4. **Run development server**
   ```bash
   pnpm dev
   ```

5. **Set up first admin**
   After creating your Supabase project and running migrations:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build (standalone output) |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test:ledger` | Run payment allocation engine tests (28 tests) |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm test:verify` | Verify test suite |
| `pnpm prepare:standalone` | Prepare standalone build for deployment |

## Project Conventions

### Code Style

- **TypeScript strict**: No `any` types where avoidable
- **No hacks to bypass TypeScript errors**: All errors must be properly resolved
- **Component pattern**: `"use client"` directive for client components
- **Import pattern**: `@/` alias for project root imports

### Bengali UI Rules

- All user-facing text is in Bengali (Bangla)
- All numbers display in Bengali numerals via `toBengaliNumber()`
- Money formatted with `formatMoney()` (Bengali numerals + ৳ prefix)
- Dates use Bengali month names via `formatDateBengali()`
- Typography: Tiro Bangla for headings, Hind Siliguri for body, JetBrains Mono for numbers

### Design System

Follow `CLAUDE.md` strictly:
- Colors: ink (#1B4332), paper (#FBF8F1), page (#EDEAE0), border (#E4DCC8), gold (#C9972D), red (#A63D40)
- Cards: rounded-sm, border, paper bg, thin colored left-edge accent
- Buttons: gold bg, ink text, rounded-sm
- Reference files in `/reference/`

### File Organization

- **Pages**: `app/<route>/page.tsx`
- **API Routes**: `app/api/<route>/route.ts`
- **Shared Libraries**: `lib/<module>.ts`
- **Components**: `components/<name>.tsx` (or `components/ui/<name>.tsx` for shadcn)
- **Tests**: `tests/<name>.test.ts`
- **Migrations**: `supabase/migrations/YYYYMMDD_description.sql`

### Git Conventions

- Branch naming: `feat/`, `fix/`, `chore/`, `docs/`
- Commit messages: conventional commits format
  - `feat: add new feature`
  - `fix: resolve bug`
  - `chore: maintenance task`
  - `docs: documentation update`
  - `merge: branch-name` for merge commits

## Testing

### Payment Ledger Tests
```bash
pnpm test:ledger
```
Runs 28 tests covering:
- Pledge resolution (with/without history)
- All allocation cases (normal, extra cash, advance, unallocated, zero pledge, edge cases)
- Ledger build functions
- Monthly coverage summary

### E2E Tests
```bash
pnpm test:e2e
```
Playwright tests for dashboard and reports.

### Running a Single Test
```bash
node --experimental-strip-types --test tests/payment-ledger.test.ts --test-name-pattern "pattern"
```

## Key Architecture Rules

1. **One canonical allocation algorithm**: TS and SQL must match. See [[payment-ledger-canonical-engine]].
2. **payment_allocations is source of truth**: All financial views derive from it.
3. **Service role key never on client**: Only used in API routes, server-side.
4. **RLS uses get_my_role()**: Not auth.role().
5. **No .env commits**: Secrets stay local.

## Deployment

### Vercel (Recommended)
- Auto-deploys from `main` branch
- Standalone output mode configured in `next.config.ts`
- Build command: `pnpm build`
- Start command: `pnpm start`

### Manual Deployment
```bash
pnpm build
pnpm prepare:standalone
# Copy .next/standalone to server
# Copy public/ and .next/static to .next/standalone/
pnpm start
```

## Common Development Tasks

### Adding a New Page
1. Create `app/<route>/page.tsx` with `"use client"` if needed
2. Add navigation entry in `components/layout.tsx`
3. Add role-based visibility in the menu configuration

### Adding a New API Route
1. Create `app/api/<route>/route.ts`
2. Add auth check (cookie-based)
3. Add role check if needed
4. Use service role client only if atomic multi-table operations needed

### Adding a New Database Table
1. Create migration in `supabase/migrations/`
2. Enable RLS
3. Add policies using `get_my_role()`
4. Update `supabase/schema.sql`
5. Generate TypeScript types if needed
6. Update this documentation
