# ADR-002: payment_allocations as Single Source of Truth

**Status:** accepted
**Date:** 2026-09-07

## Context

Before `payment_allocations` existed, reports derived monthly collections directly from `donations` amounts. This caused:
- Multi-month donations being misattributed to the received month rather than the covered months.
- Extra cash (`unallocated`) being double-counted in some views.
- No way to answer "what does this member still owe for month X?"

The dashboard's monthly collection summary view had to be rewritten multiple times (`20260906_monthly_collection_summary_canonical_allocations`, `20260906_monthly_collection_summary_keep_empty_months`, `20260907_monthly_collection_summary_from_allocations`) chasing this instability.

## Decision

All financial reporting derives from the `payment_allocations` table:

- Monthly collection summary view reads `collected_amount` from `payment_allocations` (type='pledge', grouped by month).
- Ledger (`buildMemberLedgerFromAllocations`) reads allocations first, falls back to `donations` only for migration tolerance.
- No new financial view may sum `donations.amount` directly for monthly collection figures.

**Invariant**: `SUM(payment_allocations.amount) = SUM(donations.amount)` must always hold.

## Consequences

- **Positive**: One authoritative source — views and reports can't disagree.
- **Positive**: Answered "what is owed per month" (the ledger) becomes correct.
- **Cost**: Backfill/regeneration functions needed (`backfill_payment_allocations`).
- **Cost**: Persisted allocations can get stale if a donation is edited outside `save_payment_entry`/`reallocate_payment`; edits must go through those functions.

## Alternatives Considered

- **Compute allocations on the fly in SQL views**: Rejected — expensive for large datasets and duplicative of the canonical engine.
- **Store allocation only in ledger code**: Rejected — loses auditability and the DB-level truth.