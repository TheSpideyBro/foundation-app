# Feature Map

Complete feature inventory with route, role access, and implementation status.

## Core Features

### 1. Dashboard (ড্যাশবোর্ড)
- **Route**: `/dashboard`
- **Roles**: admin, treasurer, member
- **Implementation**: `app/dashboard/page.tsx`
- **Description**: Overview with stat cards (members, donations, expenses, balance, collection rate), recent donations, monthly collection bar chart, notice board
- **Data Sources**: `member_summary`, `donation_summary`, `expense_summary`, `monthly_collection_summary` views
- **Period Selector**: monthly / yearly / total

### 2. Joma Entry (জমা এন্ট্রি)
- **Route**: `/joma`
- **Roles**: admin, treasurer
- **Implementation**: `app/joma/page.tsx`
- **Description**: Advanced payment entry form with member selection, amount, date, payment method (cash/bkash/nagad/bank), receipt number, coverage month range selector, optional pledge change, real-time allocation preview
- **Allocation Preview**: Uses `calculatePaymentAllocation` from `lib/payment-ledger.ts` to show how the payment will be split before saving
- **Auto extra amount**: the জমা field is the **total cash handed over**; whatever the coverage window cannot absorb is derived (read-only, never typed) as অতিরিক্ত জমা and sent as `extra_amount`, so `donations.amount` = total and the extra becomes its own `unallocated` allocation row
- **Backend**: `app/api/payments/route.ts` → calls `save_payment_entry` RPC (atomic insert + reallocate)
- **Edit Mode**: Supports `PUT` for reallocating existing payments via `reallocate_payment` RPC

### 3. Donations (দানসমূহ)
- **Route**: `/donations`
- **Roles**: admin, treasurer (full CRUD); member (read-only)
- **Implementation**: `app/donations/page.tsx`
- **Description**: List of all donations with filters, search, add/edit/delete (staff only), receipt download, WhatsApp share

### 4. Expenses (খরচসমূহ)
- **Route**: `/expenses`
- **Roles**: admin, treasurer (full CRUD); member (read-only)
- **Implementation**: `app/expenses/page.tsx`
- **Description**: Expense tracking with categories, amounts, descriptions, proof upload

### 5. Members (সদস্যবৃন্দ)
- **Route**: `/members`
- **Roles**: admin (full CRUD), treasurer (view + add), member (view-only)
- **Implementation**: `app/members/page.tsx`
- **Description**: Member directory with phone, address, join date, status, monthly pledge, QR codes

### 6. Reports (রিপোর্ট)
- **Route**: `/reports`
- **Roles**: admin, treasurer
- **Implementation**: `app/reports/page.tsx`
- **Description**: Financial reports with tabs for donations, expenses, members, collectors. Uses `buildMemberLedgerFromAllocations` for allocation-based ledger display. Excel export via xlsx, PDF export via jsPDF

### 7. Profile (প্রোফাইল)
- **Route**: `/profile`
- **Roles**: all authenticated users
- **Implementation**: `app/profile/page.tsx`
- **Description**: User profile with password change, member linking status, phone number

## Admin Features

### 8. Admin Dashboard
- **Route**: `/admin`
- **Roles**: admin, treasurer
- **Implementation**: `app/admin/page.tsx`
- **Description**: Admin tool grid with links to user management, pledge history, notices, categories, bulk operations, audit log, pending pledges, Google Sheets sync

### 9. User Management
- **Route**: `/admin/users`
- **Roles**: admin
- **Implementation**: `app/admin/users/page.tsx`
- **Description**: View/edit user roles, approve pending users, reset passwords, link users to member profiles

### 10. Pledge History Control
- **Route**: `/admin/pledge-history`
- **Roles**: admin
- **Implementation**: `app/admin/pledge-history/page.tsx`
- **Description**: Manage per-member pledge change history with effective dates

### 11. Notice Board
- **Route**: `/admin/notices`
- **Roles**: admin, treasurer
- **Implementation**: `app/admin/notices/page.tsx`
- **Description**: Create and manage foundation notices/announcements

### 12. Expense Categories
- **Route**: `/admin/categories`
- **Roles**: admin
- **Implementation**: `app/admin/categories/page.tsx`
- **Description**: Manage expense category taxonomy

### 13. Bulk Import/Export
- **Route**: `/admin/bulk`
- **Roles**: admin
- **Implementation**: `app/admin/bulk/page.tsx`
- **Backend**: `app/api/admin/bulk/route.ts`
- **Description**: Bulk member/donation import and export operations

### 14. Audit Log
- **Route**: `/admin/audit`
- **Roles**: admin
- **Implementation**: `app/admin/audit/page.tsx`
- **Description**: View system audit trail of all financial and administrative actions

### 15. Pending Pledges
- **Route**: `/admin/pending`
- **Roles**: admin
- **Implementation**: `app/admin/pending/page.tsx`
- **Backend**: `app/api/admin/pending-pledges/route.ts`
- **Description**: View members with overdue/due pledge payments

### 16. Member Detail (Admin)
- **Route**: `/admin/members/[id]`
- **Roles**: admin, treasurer
- **Implementation**: `app/admin/members/[id]/page.tsx`
- **Description**: Individual member view with full ledger (payment history + monthly allocation breakdown), pledge history, recent payments, receipt downloads

## Integration Features

### 17. Google Sheets Sync
- **Route**: `/api/sync-sheets` (POST), `/api/restore-sheets` (POST)
- **Roles**: admin
- **Implementation**: `lib/sheets-sync.ts`, `app/api/sync-sheets/route.ts`, `app/api/restore-sheets/route.ts`
- **Description**: Two-way sync with Google Sheets via Service Account OAuth. Backup all data to a Google Spreadsheet with per-tab organization (সদস্য, জমা, খরচ, সারসংক্ষেপ)

### 18. WhatsApp Notifications
- **Route**: `/api/notify/whatsapp`
- **Roles**: admin, treasurer
- **Implementation**: `lib/whatsapp.ts`, `app/api/notify/whatsapp/route.ts`
- **Description**: Send donation confirmation messages via WhatsApp Cloud API with receipt details

### 19. Receipt Generation
- **Route**: `/api/receipts/[id]` (GET, with `?download=1` for JPEG)
- **Roles**: all authenticated users (own receipts); staff (all receipts)
- **Implementation**: `app/api/receipts/[id]/route.ts`
- **Description**: Premium Bengali receipt as JPEG canvas with foundation logo, QR code, amount in Bengali words, signature font, verified badge. The QR payload now uses `NEXT_PUBLIC_SITE_URL` (request-origin fallback) and points at the public `/verify/[receipt_no]` page, with a "স্ক্যান করে যাচাই করুন" caption under the code.

### 19b. HTML Receipt (premium paper)
- **Route**: `/donations/[id]/receipt` (staff only)
- **Implementation**: `app/donations/[id]/receipt/page.tsx` + presentational `ReceiptPaper.tsx`
- **Description**: Editorial ivory-paper receipt on a dark stage in foundation emerald/gold. Masthead with Landmark seal, receipt-no/date band, large Bengali amount hero with কথায় line, donor/month/method/collector rows (method as gold pill, optional অতিরিক্ত জমা), QR verification card, জাযাকাল্লাহু খাইরান gratitude, signature/seal areas. Batch consolidation, staff gate, and loading/error states unchanged from before. Print stylesheet hides the toolbar and keeps exact colors.

### 19c. QR Image Endpoint
- **Route**: `/api/qr?text=...` (GET)
- **Implementation**: `app/api/qr/route.ts`
- **Description**: Renders a 240px PNG QR code (emerald on white) for short text such as receipt verify URLs. Input capped at 512 chars; the text is only *encoded*, never fetched, so there is no SSRF surface. Used by the HTML receipt's verification card.

### 20. Member QR Codes
- **Route**: `/api/members/[id]/qr`
- **Roles**: admin
- **Implementation**: `app/api/members/[id]/qr/route.ts`
- **Description**: Generate QR codes for member identification

### 21. Auto-Link Users
- **Route**: `/api/admin/auto-link`
- **Roles**: admin
- **Implementation**: `app/api/admin/auto-link/route.ts`
- **Description**: Automatically link user accounts to member profiles by matching phone numbers

### 22. Admin Delete User
- **Route**: `/api/admin/delete-user`
- **Roles**: admin
- **Implementation**: `app/api/admin/delete-user/route.ts`
- **Description**: Secure RPC-based user deletion

### 23. Reset Password
- **Route**: `/api/admin/reset-password`
- **Roles**: admin
- **Implementation**: `app/api/admin/reset-password/route.ts`
- **Description**: Admin password reset for users

## Auth Features

### 24. Login
- **Route**: `/login`
- **Implementation**: `app/login/page.tsx`
- **Description**: Email or phone login with virtual email conversion

### 25. Signup
- **Route**: `/signup`
- **Implementation**: `app/signup/page.tsx`
- **Description**: New user registration with Bengali name field

### 26. Landing Page
- **Route**: `/`
- **Implementation**: `app/page.tsx`
- **Description**: Public landing page with foundation info and login/signup links

### 27. Receipt Verification (রসিদ যাচাই)
- **Route**: `/verify/[receipt_no]`
- **Roles**: public (no login; whitelisted in `proxy.ts`)
- **Implementation**: `app/verify/[receipt_no]/page.tsx`
- **Description**: Public receipt authenticity check — the QR code printed on every receipt points here. Shows a "যাচাইকৃত রসিদ" badge, receipt number, amount in Bengali digits + words, covered month(s), date, and collector. Donor name is masked (first 3 code points + •••) for privacy. Unknown receipt numbers render a branded "রসিদ পাওয়া যায়নি" card. Lookup runs server-side with the service-role key; only verification fields are selected.

### 28. HTML Receipt View
- **Route**: `/donations/[id]/receipt`
- **Roles**: admin, treasurer (staff-gated, same pattern as other protected pages)
- **Implementation**: `app/donations/[id]/receipt/page.tsx`
- **Description**: Accessible HTML version of the donation receipt (the JPEG is invisible to screen readers). Same data as the JPEG including batch consolidation, with a print button and scoped `@media print` stylesheet. Links out to the public verify page for sharing. Supports `?embed=1` (chromeless paper-only render for the donations-page preview iframe) and `?print=1` (auto-opens the print dialog, used by the download flow).

### 29. Offline Fallback
- **Route**: `/offline`
- **Roles**: public (no login)
- **Implementation**: `app/offline/page.tsx`
- **Description**: Minimal Bengali "no connection" page with inline styles only (renders with zero cached assets). The service worker caches it on install and serves it for failed navigations, so the installed PWA shows a branded offline message instead of a dead network-error page.
