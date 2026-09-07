# Accounting Domain Model

## Overview

The Foundation uses a **modified cash-basis accounting** system with **pledge-based monthly tracking**. Members pledge a monthly amount (মাসিক অঙ্গীকার), and payments are allocated against those pledges month-by-month.

## Core Entities

### Member (সদস্য)
- **Table**: `members`
- **Key Fields**: `id`, `name`, `phone`, `address`, `monthly_pledge`, `join_date`, `status`
- `monthly_pledge` is the default monthly amount the member is expected to pay
- `status`: 'active', 'inactive'

### Donation (জমা)
- **Table**: `donations`
- **Represents**: A single payment received from a member
- **Key Fields**: `id`, `member_id`, `amount`, `date`, `method`, `receipt_no`, `received_by`, `created_by`, `coverage_start_month`, `coverage_end_month`, `batch_id`
- `method`: 'cash', 'bkash', 'nagad', 'bank'
- `coverage_start_month` / `coverage_end_month`: The month range this payment covers (YYYY-MM format)
- `batch_id`: Groups multi-month donations together

### Payment Allocation (বরাদ্দ)
- **Table**: `payment_allocations` ★ Source of Truth
- **Represents**: How a payment is split across months
- **Key Fields**: `id`, `payment_id`, `member_id`, `month`, `amount`, `allocation_type`
- **Allocation Types**:
  - `pledge`: Covers a specific month's pledge (month IS NOT NULL)
  - `unallocated`: Extra cash not assigned to any month (month IS NULL)

### Pledge History (অঙ্গীকার ইতিহাস)
- **Table**: `member_pledge_history`
- **Represents**: Historical record of pledge amount changes
- **Key Fields**: `member_id`, `monthly_amount`, `effective_from_month`
- Used by the canonical engine to resolve the correct pledge for any given month

### Expense (খরচ)
- **Table**: `expenses`
- **Represents**: Foundation expenditure
- **Key Fields**: `id`, `category`, `amount`, `date`, `description`, `proof_url`

## Allocation Rules

### The Canonical Algorithm

Every payment goes through exactly ONE allocation algorithm. This is enforced in:
- **TypeScript**: `calculatePaymentAllocation()` in `lib/payment-ledger.ts`
- **SQL**: `calculate_payment_allocation()` in Supabase migrations
- **UI Preview**: Joma Entry uses the TS engine for real-time preview
- **Backfill**: `backfill_payment_allocations()` uses the SQL engine

#### Pledge Resolution Precedence (identical in TS and SQL)
1. **Latest applicable pledge-history entry** — the most recent `member_pledge_history` record where `effective_from_month <= target_month`
2. **member.monthly_pledge** — fallback if no pledge history applies
3. **0** — if neither exists

The resolved pledge is clamped to ≥ 0.

#### Allocation Step-by-Step
```
For each month in [coverage_start, coverage_end]:
  1. Resolve pledge for this month
  2. allocated = MIN(remaining_payment, pledge)
  3. remaining -= allocated
  4. Record allocation row (amount, type='pledge', month)

If remaining > 0 after all months:
  Record allocation row (amount, type='unallocated', month=NULL)
```

### Allocation Types

| Type | Month Field | Meaning |
|------|-------------|---------|
| `pledge` | NOT NULL (YYYY-MM) | Covers a specific month's expected pledge |
| `unallocated` | NULL | Extra cash not assigned to any month — sits as credit |

### Zero-Sum Invariant

**SUM(payment_allocations.amount) MUST EQUAL SUM(donations.amount)** at all times.

This is verified after every backfill and after every live-DB change.

## Monthly Collection Summary

**View**: `monthly_collection_summary`
- Derives `collected_amount` from `payment_allocations` WHERE `allocation_type = 'pledge'`
- Provides: `month`, `collected_amount`, `donation_count`, `expense_amount`
- Used by Dashboard and Reports for period-based financial views

## Ledger Model

### buildMemberLedgerFromAllocations()

The ledger shows per-month financial status for a member:

| Field | Source |
|-------|--------|
| `month` | Calendar month (YYYY-MM) |
| `expected` | `resolvePledgeForMonth(month, member.monthly_pledge, pledgeHistory)` |
| `paid` | SUM of allocations for this month |
| `remaining` | MAX(0, expected - paid) |
| `status` | 'paid' (remaining=0), 'partial' (0 < paid < expected), 'due' (paid=0), 'overpaid' (paid > expected) |
| `unallocated` | SUM of allocations WHERE allocation_type='unallocated' AND payment covers this month |
| `donations` | List of individual payment records for this month |

### Precedence Rule for Ledger
When allocations exist for a payment, they take precedence. The ledger only falls back to raw donation amounts when no allocations are found (migration tolerance).

## Financial Reporting

### Period Types
- **Monthly**: Current month's collection vs expenses
- **Yearly**: Full year aggregation with per-month breakdown
- **Total**: All-time cumulative

### Export Formats
- **Excel**: Full data export with formatted headers (xlsx/exceljs)
- **PDF**: Summary report (jsPDF)

## Key Invariants

1. **Every taka is accounted for**: allocation_type must be either 'pledge' (assigned to a month) or 'unallocated' (extra credit)
2. **No negative allocations**: pledge_amount is clamped to ≥ 0
3. **Idempotent reallocation**: `reallocate_payment` deletes old allocations and regenerates from scratch
4. **Single source of truth**: `payment_allocations` is the canonical table. Views and ledger code derive from it.
5. **SQL-TS parity**: The SQL and TypeScript allocation engines must produce identical results for the same inputs
