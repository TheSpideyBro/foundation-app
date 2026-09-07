# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting significant architectural decisions made for this project.

## Purpose

ADRs provide an historical record of decisions and their rationale, so future developers understand WHY the code is structured a certain way. If a decision is superseded, a new ADR should be created referencing the old one.

## Status Legend

- **accepted**: The decision is currently in effect
- **proposed**: Under consideration
- **superseded**: Replaced by a newer decision (link to new ADR)
- **rejected**: Considered but not adopted (may still hold lessons)

## ADR Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [ADR-001](ADRs/ADR-001-canonical-payment-allocation.md) | Single Canonical Payment Allocation Engine | accepted | 2026-09-07 |
| [ADR-002](ADRs/ADR-002-payment-allocations-source-of-truth.md) | payment_allocations as Single Source of Truth | accepted | 2026-09-07 |
| [ADR-003](ADRs/ADR-003-service-role-server-api.md) | Service Role Key Confined to Server API Routes | accepted | 2026-09-07 |
| [ADR-004](ADRs/ADR-004-member-privacy-rls.md) | Member Data Privacy via RLS | accepted | 2026-08 |
| [ADR-005](ADRs/ADR-005-server-side-receipt-generation.md) | Server-Side Receipt Generation with node-canvas | accepted | 2026-08 |
| [ADR-006](ADRs/ADR-006-phone-login-virtual-email.md) | Phone Login via Virtual Email Conversion | accepted | 2026-08 |

## Writing a New ADR

Template:

```markdown
---
status: accepted
date: YYYY-MM-DD
---

# ADR-NNN: Title

## Context
What problem or situation prompted this decision?

## Decision
What was decided.

## Consequences
What are the trade-offs, costs, and benefits?

## Alternatives Considered
Other options that were evaluated and rejected (with reason).
```

Naming convention: `ADR-NNN-kebab-case-title.md` where NNN is the next sequential number.