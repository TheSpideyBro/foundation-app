# Security and Validation Updates - Aug 25, 2026

## 1. RLS Policy Updates
- **Members Table**: Added `members_update_own` policy to allow users to update their own member profile information (`name`, `phone`, `address`) if `auth.uid() = user_id`.
- **Users Table**: Verified `users_admin_all` policy exists to allow admins to link `member_id` to user records.

## 2. Validation & Error Handling
- **Profile Page**:
  - Added trim-check for name (required).
  - Added regex validation for phone number (exactly 11 digits).
  - Added try-catch blocks with user-friendly alerts.
  - Added loading states (`submitting`) to prevent duplicate submissions.
- **Admin Users Page**:
  - Added name and phone validation for profile creation.
  - Added transaction-like logic: creates member first, then links user.
  - Added clear feedback for success/failure.

## 3. Data Integrity
- Ensured that when a user updates their profile, both the `members` and `users` tables are updated to keep information synchronized.
- Restricted critical fields (`role`, `monthly_pledge`) to admin-only updates via RLS and UI design.
