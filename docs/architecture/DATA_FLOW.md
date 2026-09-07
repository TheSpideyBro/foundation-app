# Data Flow Diagrams

## Payment Allocation Flow

The most critical data flow in the system. Every taka must be accounted for.

```mermaid
flowchart TD
    A[Member pays ৳1000] --> B{Joma Entry Form}
    B --> C[Client: calculatePaymentAllocation]
    C --> D[Real-time Preview]
    D --> E[User clicks Save]
    E --> F[POST /api/payments]
    F --> G{Auth Check}
    G -->|No Session| H[401 Unauthorized]
    G -->|Wrong Role| I[403 Forbidden]
    G -->|Admin/Treasurer| J[service-role Supabase client]
    J --> K[save_payment_entry RPC]
    K --> L[PostgreSQL Transaction]
    L --> M[1. Insert into donations]
    L --> N[2. Delete old allocations for this payment]
    L --> O[3. Insert new payment_allocations]
    L --> P[4. Update member.monthly_pledge if changed]
    M --> Q[Return success]
    N --> Q
    O --> Q
    P --> Q
    Q --> R[Monthly Collection Summary View]
    R --> S[Dashboard + Reports]
```

## Allocation Algorithm (Canonical)

```mermaid
flowchart TD
    A[Payment Amount: ৳1000] --> B[Coverage Start: 2026-08]
    A --> C[Coverage End: 2026-10]
    B --> D[For each month in range]
    C --> D
    D --> E[Resolve Pledge for Month]
    E --> F{Has pledge-history entry?}
    F -->|Yes| G[Use latest applicable entry]
    F -->|No| H[Fallback to member.monthly_pledge]
    H --> I{Has monthly_pledge?}
    I -->|Yes > 0| J[Use monthly_pledge value]
    I -->|No / 0| K[Pledge = 0]
    G --> L[Clamp to >= 0]
    J --> L
    K --> L
    L --> M[Allocated = MIN remaining, pledge]
    M --> N[Remaining = Remaining - Allocated]
    N --> O{More months?}
    O -->|Yes| D
    O -->|No| P{Remaining > 0?}
    P -->|Yes| Q[Unallocated row, month=NULL]
    P -->|No| R[Done]
```

## Ledger Build Flow (Reports / Member Detail)

```mermaid
flowchart TD
    A[Load Member Page] --> B[Fetch: member, donations, allocations, pledgeHistory]
    B --> C[buildMemberLedgerFromAllocations]
    C --> D[For each month in range]
    D --> E[Sum allocations WHERE month = current]
    D --> F[Sum donations for this month]
    E --> G[paid = sum of allocations]
    F --> H[donations list for this month]
    G --> I[expected = resolvePledgeForMonth]
    I --> J[remaining = MAX 0, expected - paid]
    J --> K[status: paid / partial / due / overpaid]
    K --> L[unallocated = sum where month is NULL for this donation]
    L --> M[Return ledger row]
    H --> M
```

## Auth Flow

```mermaid
flowchart TD
    A[User visits /dashboard] --> B[Next.js Middleware]
    B --> C{Session exists?}
    C -->|No| D[Redirect to /login]
    C -->|Yes| E[Allow access]
    D --> F[Login page]
    F --> G{Phone or Email?}
    G -->|Phone| H[Convert to virtual email]
    G -->|Email| I[Use directly]
    H --> J[Supabase Auth signInWithPassword]
    I --> J
    J --> K{Success?}
    K -->|No| L[Show error]
    K -->|Yes| M[Set session cookie]
    M --> N[Redirect to /dashboard]
    N --> O[AuthProvider.resolveRole]
    O --> P[Query users table for role]
    P --> Q[Role available to all components via useAuth hook]
```

## Google Sheets Sync Flow

```mermaid
flowchart TD
    A[Admin clicks Sync] --> B[POST /api/sync-sheets]
    B --> C[Auth check: admin role required]
    C --> D[sheets-sync.ts: Create JWT]
    D --> E[Google Service Account OAuth]
    E --> F[Get Access Token]
    F --> G[Fetch all data from Supabase]
    G --> H[donations, expenses, members, pledge_history]
    H --> I[Format data per tab]
    I --> J[Batch update Google Sheets API]
    J --> K[Return sync counts]
```

## Receipt Generation Flow

```mermaid
flowchart TD
    A[GET /api/receipts/id] --> B[Server auth check]
    B --> C[Fetch: donation, member, collector]
    C --> D[Load Bengali fonts]
    D --> E[node-canvas: create 800x1200 canvas]
    E --> F[Draw: header, logo, foundation name]
    F --> G[Draw: receipt details, amount, method]
    G --> H[Draw: amount in Bengali words]
    H --> I[Draw: QR code overlay]
    I --> J[Draw: signature, verified badge]
    J --> K{?download=1}
    K -->|Yes| L[Return JPEG buffer]
    K -->|No| M[Return JPEG with inline display]
```

## WhatsApp Notification Flow

```mermaid
flowchart TD
    A[After payment saved] --> B[POST /api/notify/whatsapp]
    B --> C[Format message in Bengali]
    C --> D[WhatsApp Cloud API request]
    D --> E{Success?}
    E -->|Yes| F[Return sent status]
    E -->|No| G[Log error, return failure]
```
