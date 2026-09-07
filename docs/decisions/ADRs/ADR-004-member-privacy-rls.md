# ADR-004: Member Data Privacy via RLS

**Status:** accepted
**Date:** 2026-08

## Context

The Foundation app stores sensitive member data: phone numbers, addresses, and financial histories. The app has three roles (admin, treasurer, member). The original implementation exposed all member data to all authenticated users, and members could see everyone's payment history.

The requirement: members should see ONLY their own financial data; staff see what their role requires.

## Decision

Row-Level Security is the enforcement point.

- All tables have `ENABLE ROW LEVEL SECURITY`.
- Policies gate access: authenticated users can read/deposit, staff (`admin`/`treasurer`) can write, admin-only policies for destructive operations.
- Role resolution uses a `get_my_role()` SQL function reading the custom `users` table — **not** `auth.role()`, because the custom role model (member/treasurer/admin) is independent of Supabase Auth's built-in roles.
- The browser UI also filters by role (`useAuth()` → `role`), matching RLS so the UI never even fetches what the user can't see.

## Consequences

- **Positive**: Defense in depth — even a buggy UI or a raw client can't leak other members' rows.
- **Positive**: Adding the member privacy view (member sees own ledger) is just a policy.
- **Cost**: Every new table needs policies — forgetting one defaults to deny (safe default).
- **Cost**: `get_my_role()` is a DB round trip per RLS check; acceptable at this scale.

## Alternatives Considered

- **Silent filtering in the app layer**: Rejected — the data still exists in the client's network traffic and can be queried directly via PostgREST.
- **Supabase `auth.role()`**: Rejected — does not map to the app's custom roles and is coarser than needed.