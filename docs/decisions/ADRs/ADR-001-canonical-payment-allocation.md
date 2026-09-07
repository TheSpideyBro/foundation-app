# ADR-001: Single Canonical Payment Allocation Engine

**Status:** accepted
**Date:** 2026-09-07

## Context

The payment allocation algorithm — how a donation gets split across months against a member's monthly pledge — is the heart of the accounting model. It exists in two execution environments:

1. **TypeScript** (`lib/payment-ledger.ts`): Used by the Joma Entry UI for live preview and by `buildMemberLedgerFromAllocations` for reports.
2. **SQL** (`calculate_payment_allocation` in Supabase): Used by `save_payment_entry`, `reallocate_payment`, and `backfill_payment_allocations` to persist allocations.

An earlier divergence between the two caused **37 of 40 donations to be misclassified as `unallocated`**: the SQL function resolved pledges only from `member_pledge_history` while TypeScript's `resolvePledgeForMonth` also fell back to `member.monthly_pledge`. Every member without pledge history was allocated the wrong way, and the monthly report showed collected = 0.

## Decision

The allocation algorithm MUST exist as ONE canonical specification, enforced in both implementations with identical precedence:

```
resolve pledge for month m =
  1. latest applicable member_pledge_history entry (effective_from_month <= m)
  2. else member.monthly_pledge
  3. else 0
  clamped >= 0
```

- `lib/payment-ledger.ts` is the reference implementation.
- `calculate_payment_allocation` SQL function MUST mirror it exactly.
- Contributions touching the engine MUST change both implementations together.
- Any change MUST be verified: `SUM(payment_allocations.amount) = SUM(donations.amount)`.

## Consequences

- **Positive**: Financial integrity guaranteed — no allocation drift between UI preview, reports, and persisted DB state.
- **Positive**: Backfills and reallocations produce results consistent with what the UI previews.
- **Cost**: Changes are more involved (touch TS + SQL + tests + memory).
- **Cost**: Requires discipline to keep both implementations in sync.

## Alternatives Considered

- **SQL-only engine**: Rejected — the UI needs synchronous preview without a round trip.
- **TS-only engine with API reallocation**: Rejected — would break atomicity guarantees of `save_payment_entry` RPC.
- **Contract tests generating random allocations**: Considered — the 28-case test suite serves this role; a property-based test could be added later (see TECH_DEBT).