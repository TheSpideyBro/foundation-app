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
Supabase Auth Session → AuthProvider.resolveRole() → 
  Query users table → user.role field → 
  UI filtering + API route checks
```

### Role Hierarchy

| Role | Bengali | Permissions |
|------|---------|-------------|
| `admin` | অ্যাডমিন | Full access: all CRUD, user management, pledge control, bulk ops, audit, Google Sheets sync, member detail |
| `treasurer` | ট্রেজারার | Record payments, view/edit donations & expenses, view reports, send WhatsApp, view member detail |
| `member` | সদস্য | View own profile, view own receipts, view notices (read-only) |

### Admin Hardcode
- Email `saddamakash234@gmail.com` is hardcoded as admin in multiple components as a safety net
- Files: `components/layout.tsx`, `app/admin/page.tsx`, `app/admin/members/[id]/page.tsx`
- **Risk**: This is a known technical debt item (TD-001)

### API Route Authorization
- All `/api/*` routes check auth via cookie token
- Payment API (`/api/payments`) checks role = admin or treasurer
- Admin APIs check role = admin
- Service role key used server-side only, never exposed to browser

## Row-Level Security (RLS)

All tables have RLS enabled. Policies use `get_my_role()` function (not `auth.role()`).

### Key RLS Patterns

```sql
-- Members: users can read all, only admin/treasurer can write
CREATE POLICY "members_select" ON members FOR SELECT USING (true);
CREATE POLICY "members_insert" ON members FOR INSERT 
  WITH CHECK (get_my_role() IN ('admin', 'treasurer'));

-- Donations: staff can CRUD, members can read
CREATE POLICY "donations_select" ON donations FOR SELECT USING (true);
CREATE POLICY "donations_insert" ON donations FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'treasurer'));

-- payment_allocations: authenticated users can read, only service-role writes
CREATE POLICY "payment_allocations_select" ON payment_allocations 
  FOR SELECT USING (auth.role() = 'authenticated');
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

- `lib/audit.ts` calls `log_audit_event` RPC for every significant action
- Migration-resilient: fails silently if the function doesn't exist yet
- Audit events stored in `audit_log` table with: user_id, action, details (JSONB), created_at
- Viewable at `/admin/audit`
