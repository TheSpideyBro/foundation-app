# Roles & Permissions

## Overview

The app implements three roles with a strict permission hierarchy.

| Role | Bengali | Hierarchy |
|------|---------|-----------|
| `admin` | অ্যাডমিন | Highest — all permissions |
| `treasurer` | ট্রেজারার | Middle — financial operations |
| `member` | সদস্য | Lowest — personal access only |

## Permission Matrix

### Authentication & Account

| Permission | member | treasurer | admin |
|-----------|--------|-----------|-------|
| Login / Signup | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ |

### Data Views

| View | member | treasurer | admin |
|------|--------|-----------|-------|
| Dashboard | ✅ (own) | ✅ | ✅ |
| Own profile | ✅ | ✅ | ✅ |
| Members list | 👁 view-only | 👁 view-only | ✅ full |
| Donations list | 👁 view-only | ✅ full | ✅ full |
| Expenses list | 👁 view-only | ✅ full | ✅ full |
| Reports | ❌ | ✅ | ✅ |
| Audit log | ❌ | ❌ | ✅ |
| All member ledgers | ❌ | ✅ | ✅ |

### Transactions

| Action | member | treasurer | admin |
|--------|--------|-----------|-------|
| Record payment (Joma Entry) | ❌ | ✅ | ✅ |
| Edit/delete donation | ❌ | ✅ | ✅ |
| Add/edit/delete expense | ❌ | ✅ | ✅ |
| Download own receipt | ✅ | ✅ | ✅ |
| Download anyone's receipt | ❌ | ✅ | ✅ |

### Member & Pledge Management

| Action | member | treasurer | admin |
|--------|--------|-----------|-------|
| Add member | ❌ | 👁 (add) | ✅ |
| Edit member | ❌ | ❌ | ✅ |
| Delete member | ❌ | ❌ | ✅ |
| Pledge history control | ❌ | ❌ | ✅ |
| Bulk import/export | ❌ | ❌ | ✅ |
| Member QR codes | ❌ | ❌ | ✅ |

### Administration

| Action | member | treasurer | admin |
|--------|--------|-----------|-------|
| User management (roles/approval) | ❌ | ❌ | ✅ |
| Reset user password | ❌ | ❌ | ✅ |
| Delete user | ❌ | ❌ | ✅ |
| Auto-link users to members | ❌ | ❌ | ✅ |
| Notice board management | ❌ | ✅ | ✅ |
| Expense categories | ❌ | ❌ | ✅ |
| Pending pledges view | ❌ | ❌ | ✅ |
| Google Sheets sync | ❌ | ❌ | ✅ |

## Enforcement Layers

Authorization is enforced at FOUR layers, defense-in-depth:

1. **Navigation / UI filtering** — `components/layout.tsx` hides menu items not allowed for the role; pages show role-gated actions.
2. **API route checks** — every `/api/*` route calls `requireAuth("staff" | "admin")` (`lib/server-auth.ts`), which resolves the role from the cookie session **and rejects `is_approved !== true`** (BUG-014).
3. **Row-Level Security (RLS)** — database policies use `get_my_role()` to enforce at the data layer; write RPCs (`save_payment_entry`, `reallocate_payment`, `backfill_payment_allocations`) are `service_role`-only, so anon/authenticated cannot call them at all (BUG-015).
4. **Approval gate** — `isApproved()` (`lib/auth.ts`) fails closed (`is_approved === true`); the column is `NOT NULL DEFAULT false` in the live schema, so an unapproved account sees the "awaiting approval" screen regardless of role.

## Role Resolution

Roles are stored in the `users` table (not `auth.users`). Resolution happens in `components/providers.tsx`:

```ts
const { data, error } = await supabase()
  .from("users")
  .select("role, is_approved, member_id, phone")
  .eq("id", uid)
  .maybeSingle();
// no row → profileError set ("প্রোফাইল তৈরি হয়নি"), not a silent "awaiting approval"
```

The resolved `role` / `isApproved` / `memberId` / `phone` are exposed to all components via the `useAuth()` hook. UI checks should use `isStaff` / `isAdmin` / `isApproved` from `lib/auth.ts` — never inline an email literal (BUG-014).

## Known Caveat

`isAdmin()` and `isStaff()` in `lib/auth.ts` return `true` for one hardcoded address (`FOUNDER_EMAIL`, overridable via `NEXT_PUBLIC_FOUNDER_EMAIL`) regardless of `users.role`. This is the single remaining bypass — nothing else in the codebase compares emails inline. See [TD-001](../decisions/TECH_DEBT.md#td-001-hardcoded-founder-email-as-admin-bypass); delete it once the founder's `users.role` row is confirmed to be `admin`.