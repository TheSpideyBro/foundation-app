# Security Model

## Authentication

- **Provider**: Supabase Auth (email + phone)
- **Session Management**: Cookie-based via `@supabase/ssr`
- **Middleware**: `middleware.ts` checks session on every request, redirects unauthenticated users to `/login`
- **Public Routes**: `/`, `/login`, `/signup`, PWA assets (`/manifest.json`, `/sw.js`, icons)
- **Phone Login**: Converted to virtual email format `{phone}@foundation.local` for Supabase Auth compatibility

## Authorization (RBAC)

### Role Resolution Flow
```
Supabase Auth Session → useAuth() (components/providers.tsx) / requireAuth() (lib/server-auth.ts)
  → query users table → users.role
  → UI gates + /api/* checks (all via lib/auth.ts helpers)
```

Role checks must come from `lib/auth.ts` (`isStaff`, `isAdmin`, `isApproved`) so
there is exactly one definition of "admin" and "staff" (TD-001).

### Role Hierarchy

| Role | Bengali | Permissions |
|------|---------|-------------|
| `admin` | অ্যাডমিন | Full access: all CRUD, user management, pledge control, bulk ops, audit, Google Sheets sync, member detail |
| `treasurer` | ট্রেজারার | Record payments, view/edit donations & expenses, view reports, send WhatsApp, view member detail |
| `member` | সদস্য | View own profile, view own receipts, view notices (read-only) |

### Founder Bypass
- `FOUNDER_EMAIL` in `lib/auth.ts` (defaults to the owner's address,
  overridable via `NEXT_PUBLIC_FOUNDER_EMAIL`) grants `isAdmin()`/`isStaff()`
  even if `users.role` is wrong. It is the single place an email literal
  appears — components no longer hardcode an address (TD-001).
- **Risk**: kept as a safety net until the founder's `users.role` is verified
  to be `admin` in the live database.

### API Route Authorization
- Every `/api/*` route starts with `requireAuth("staff")` or
  `requireAuth("admin")` from `lib/server-auth.ts`:
  session required → `users.is_approved === true` → role check.
- Payment API (`/api/payments`) uses `requireAuth("staff")` and the
  **service-role** client — it is the only legitimate caller of
  `save_payment_entry()` / `reallocate_payment()`.
- Admin APIs use `requireAuth("admin")`.
- Service role key used server-side only, never exposed to browser.

## Row-Level Security (RLS)

All 9 tables have RLS enabled. Policies use `get_my_role()` (never
`auth.role()`). The authoritative list lives in `supabase/schema.sql`
(generated from the live catalog) — the short version:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `members` | staff, or own row (`members_select_own`) | staff | staff, or own row **name/address/phone only** (`members_update_own` + `enforce_member_self_update()` trigger) | admin |
| `users` | self or admin (`users_read_self`), staff (`users_read_staff`) | self, as `member`/`is_approved=false` (`users_insert_self`) | self (profile columns only — role/approval/member_id are pinned) or admin | admin |
| `donations` | staff, or own rows via `users.member_id` | staff | staff | staff (`donations_delete_staff`) |
| `expenses`, `expense_categories`, `member_pledge_history`, `payment_allocations` | staff | staff | staff | admin |
| `notices` | all | admin | admin | admin |
| `audit_log` | admin | — (DB triggers only) | — | — |

Notes:

- `members_update_own` + the `trg_member_self_update` trigger together stop a
  member from editing their own `monthly_pledge`, `status` or `join_date`.
- `users_update_self_profile` keeps `role`, `is_approved` and `member_id`
  pinned to their current values on self-service updates.
- **Write RPCs are service-role only**: `save_payment_entry()` and
  `reallocate_payment()` had `SECURITY DEFINER` with no internal auth check
  and were executable by `anon`/`authenticated` (DB-001). The
  `20260929_harden_definer_rpcs.sql` migration revoked those and left only
  `service_role`.
- **Views are owner-rights** (no `security_invoker`): `anon` was revoked from
  all 6 summary views and `notices` (DB-006). Base tables are still reachable
  by `anon`, but RLS + `get_my_role()` deny every row.
- `handle_new_user()` ignores client metadata for `role`/`is_approved`
  (BUG-012) — signup always creates `member` / `false`.
- `generate_receipt_no()` takes `pg_advisory_xact_lock` and no longer
  truncates the sequence (DB-003), so receipt numbers cannot collide.

Regenerate the reference after any migration:

```bash
SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... \
  python3 scripts/dump-supabase-schema.py > supabase/schema.sql
```

## Security Headers

Set in `next.config.ts`:
```
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Secrets Management

| Secret | Location | Used By |
|--------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` (server only) | API routes (payments, admin) |
| `NEXT_SUPABASE_SERVICE_ROLE_KEY` | `.env.local` (server only) | Alternate env var name |
| Google Service Account JSON | `.env.local` | Sheets sync |
| WhatsApp API Token | `.env.local` | WhatsApp notifications |

### Security Rules
1. **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
2. **NEVER** use `NEXT_PUBLIC_` prefix for service role keys
3. **NEVER** commit `.env.local` or any secret files
4. Service role usage is confined to `app/api/payments/route.ts` and admin API routes

## Audit Trail

- Written **only by database triggers** — `log_audit_event()` is a zero-argument
  trigger function attached to `donations`, `expenses` and `members`
  (`audit_donations`, `audit_expenses`, `audit_members`). It runs as
  `SECURITY DEFINER` with `auth.uid()` as the actor and falls back to the
  first admin row for service-role writes.
- There is no application-side audit helper: `lib/audit.ts` was dead code that
  called an RPC signature the function never had (every call logged a warning),
  so it was deleted rather than repaired.
- `audit_log` rows carry `actor_id`, `actor_email`, `action` (INSERT/UPDATE/
  DELETE), `target_table`, `target_id`, `details` (JSONB old/new) and
  `created_at`; viewable at `/admin/audit` (admin-only SELECT policy).
