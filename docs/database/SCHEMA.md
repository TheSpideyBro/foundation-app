# Database Schema

## Overview

- **Engine**: PostgreSQL via Supabase
- **RLS**: Enabled on all tables
- **Auth Integration**: `auth.users()` for authentication, custom `users` table for roles
- **Full Schema File**: `supabase/schema.sql`

## Tables

### users
Application-level user profiles linked to Supabase Auth.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | References auth.users(id) |
| email | TEXT | User email |
| role | TEXT | 'admin', 'treasurer', 'member' |
| name | TEXT | Bengali display name |
| phone | TEXT | Phone number |
| is_approved | BOOLEAN | Account approval status |
| member_id | UUID FK | Links to members(id) |

### members
Foundation members who pay monthly pledges.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | Bengali name |
| phone | TEXT | |
| address | TEXT | |
| monthly_pledge | NUMERIC | Default monthly expected amount (BDT) |
| join_date | DATE | |
| status | TEXT | 'active' / 'inactive' |
| user_id | UUID FK | Nullable, links to users(id) |

### donations
Payment records from members.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| member_id | UUID FK | → members(id) |
| amount | NUMERIC | Payment amount in BDT |
| date | DATE | Payment date |
| method | TEXT | 'cash', 'bkash', 'nagad', 'bank' |
| receipt_no | TEXT | Generated receipt number |
| received_by | UUID FK | Staff member who received |
| created_by | UUID FK | User who created the record |
| note | TEXT | Optional note |
| coverage_start_month | TEXT | First month covered (YYYY-MM) |
| coverage_end_month | TEXT | Last month covered (YYYY-MM) |
| batch_id | UUID | Groups multi-month donations |

### payment_allocations ★ Source of Truth
How each donation is split across months.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| payment_id | UUID FK | → donations(id) |
| member_id | UUID FK | → members(id) |
| month | TEXT | YYYY-MM for pledge allocations, NULL for unallocated |
| amount | NUMERIC | Amount allocated to this month |
| allocation_type | TEXT | 'pledge' or 'unallocated' |
| created_at | TIMESTAMPTZ | Auto |

**Indexes**: `idx_alloc_payment`, `idx_alloc_member`, `idx_alloc_month`, `idx_alloc_type_member`

### member_pledge_history
Tracks pledge amount changes over time.

| Column | Type | Notes |
|--------|------|-------|
| member_id | UUID FK | → members(id) |
| monthly_amount | NUMERIC | Pledge amount effective from this month |
| effective_from_month | TEXT | YYYY-MM when this pledge takes effect |

### expenses
Foundation expenditures.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| category | TEXT | Expense category |
| amount | NUMERIC | |
| date | DATE | |
| description | TEXT | |
| proof_url | TEXT | Link to proof document |

### notices
Foundation announcements.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| title | TEXT | |
| content | TEXT | |
| created_by | UUID FK | → users(id) |
| created_at | TIMESTAMPTZ | |

### expense_categories
Category taxonomy for expenses.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | Category name (Bengali) |

### audit_log
System audit trail.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | → users(id) |
| action | TEXT | Action type |
| details | JSONB | Action-specific data |
| created_at | TIMESTAMPTZ | |

## Views

### member_summary
Aggregated member stats: total members, active count, total pledge amount.

### donation_summary
Aggregated donation stats: total donations, total amount, average donation.

### expense_summary
Aggregated expense stats: total expenses, total amount, by category.

### monthly_collection_summary ★
Monthly collection data derived from `payment_allocations`.

| Column | Type | Notes |
|--------|------|-------|
| month | TEXT | YYYY-MM |
| collected_amount | NUMERIC | SUM of allocations WHERE type='pledge' |
| donation_count | INTEGER | Number of donations |
| expense_amount | NUMERIC | Total expenses for this month |

**Important**: This view reads from `payment_allocations`, not directly from `donations`. The `collected_amount` represents only allocated (pledge-type) amounts, not total donations received.

## SQL Functions

### calculate_payment_allocation(p_payment_id, p_member_id, p_payment_amount, p_coverage_start, p_coverage_end, p_pledge_history)
Canonical allocation engine. Returns TABLE(month, amount, allocation_type).
See [[ACCOUNTING_DOMAIN]] for algorithm details.

### save_payment_entry(p_member_id, p_amount, p_date, p_method, p_receipt_no, p_received_by, p_created_by, p_note, p_coverage_start, p_coverage_end, p_pledge_history, p_new_monthly_pledge)
Atomic payment entry: inserts donation, generates allocations, optionally updates member pledge.
Returns: donation_id, allocation_count.

### reallocate_payment(p_payment_id, p_member_id, p_amount, p_coverage_start, p_coverage_end, p_pledge_history)
Deletes existing allocations for a payment and regenerates them.
Returns: allocation_count.

### backfill_payment_allocations()
Regenerates ALL allocations from scratch for every donation.
Used for data migration and integrity recovery.

### log_audit_event(p_user_id, p_action, p_details)
Writes to audit_log table. Migration-resilient.

### get_my_role()
Returns the current user's role from the users table.
Used by RLS policies (not auth.role()).

### delete_user(target_user_id)
Admin-only user deletion via RPC.

## Migration History

| # | File | Date | Description |
|---|------|------|-------------|
| 1 | `20260828_harden_rls_and_integrity.sql` | 2026-08-28 | Initial RLS hardening, constraints, triggers |
| 2 | `20260830_add_admin_delete_user_rpc.sql` | 2026-08-30 | Admin user deletion via secure RPC |
| 3 | `20260901_dashboard_summary_views.sql` | 2026-09-01 | Dashboard summary views (member/donation/expense) |
| 4 | `20260902_donation_staff_permissions.sql` | 2026-09-02 | Staff donation CRUD permissions |
| 5 | `20260906_monthly_collection_summary_canonical_allocations.sql` | 2026-09-06 | First attempt at allocation-based summary view |
| 6 | `20260906_monthly_collection_summary_keep_empty_months.sql` | 2026-09-06 | Fix to preserve months with zero collections |
| 7 | `20260907_add_payment_allocations.sql` | 2026-09-07 | ★ payment_allocations table, allocation functions, RLS |
| 8 | `20260907_monthly_collection_summary_from_allocations.sql` | 2026-09-07 | Rewrite summary view from payment_allocations |
| 9 | `20260907_payment_allocations_member_pledge_fallback.sql` | 2026-09-07 | Fix: add member.monthly_pledge fallback to SQL engine |
