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

Authorization is enforced at THREE layers, defense-in-depth:

1. **Navigation / UI filtering** — `components/layout.tsx` hides menu items not allowed for the role; pages show role-gated actions.
2. **API route checks** — every `/api/*` route validates session (cookie) + role before acting.
3. **Row-Level Security (RLS)** — database policies use `get_my_role()` to enforce at the data layer.

## Role Resolution

Roles are stored in the `users` table (not `auth.users`). Resolution happens in `components/providers.tsx`:

```ts
async function resolveRole(userId: string) {
  const { data } = await supabase().from("users").select("role").eq("id", userId).single();
  return data?.role;
}
```

The resolved role is exposed to all components via the `useAuth()` hook.

## Known Caveat

`app/admin/page.tsx`, `components/layout.tsx`, and `app/admin/members/[id]/page.tsx` treat `user.email === 'saddamakash234@gmail.com'` as admin, independent of role. See [TD-001](../decisions/TECH_DEBT.md#td-001-hardcoded-founder-email-as-admin-bypass).