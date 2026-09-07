# ADR-003: Service Role Key Confined to Server API Routes

**Status:** accepted
**Date:** 2026-09-07

## Context

The payment save flow requires atomic multi-table operations: insert donation, delete+regenerate allocations, optionally update member pledge. With RLS, the browser client (authenticated user with member/treasurer role) cannot perform all these writes reliably — the `save_payment_entry` function runs `SECURITY DEFINER`, but invoking it with sensitive parameters from the browser risks exposure.

The service role key bypasses RLS entirely and can read/write everything. If placed in client code, anyone could extract it from the JS bundle and take full control of the database.

## Decision

The Supabase **service role key** is used ONLY in server-side API routes (`app/api/payments/route.ts`, admin routes). It is:

- Never in the browser bundle (no `NEXT_PUBLIC_` prefix).
- Read from env vars `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_SUPABASE_SERVICE_ROLE_KEY`.
- Used only after the route authenticates the caller via cookie token AND checks the role (admin/treasurer).

Public-key operation (`anon key`) is used everywhere else.

## Consequences

- **Positive**: Browser never sees elevated credentials — stealing the specific API contract is the only attack surface.
- **Positive**: RPC functions can be `SECURITY DEFINER` while access is still gated at the API layer.
- **Cost**: Two Supabase clients in the server codebase (anon + service role) — must be careful not to leak one for the other.
- **Risks**: If the hardcoded admin email bypass (`saddamakash234@gmail.com`, see TD-001) grows, it weakens the role gate. Shape roles centrally instead.

## Alternatives Considered

- **SECURITY DEFINER RPC callable by authenticated users directly**: Rejected — parameter validation would live scattered across functions, and member-level users must not invoke treasurer-level writes.
- **All client writes with RLS policies doing the allocation**: Rejected — allocation is a multi-table *computed* write that is impractical to express as policies.