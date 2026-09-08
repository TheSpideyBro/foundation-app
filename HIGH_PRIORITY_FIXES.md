# High-Priority Fixes Applied

## 1. Extra Amount

The Joma Entry form now has an editable **Extra Amount / অতিরিক্ত জমা** field. The value is validated as non-negative, sent through `app/api/payments/route.ts`, persisted in the new `donations.extra_amount` column, and stored as an `unallocated` payment allocation. The monthly allocation calculation uses the regular payment amount only, so extra cash does not silently advance future months.

The receipt generator also displays Extra Amount as a separate line while the total receipt amount includes both regular payment and extra amount.

Migration: `supabase/migrations/20260908_extra_amount_and_receipt.sql`

## 2. Receipt Preview and Download

After a successful Joma Entry, the success screen now shows **রসিদ প্রিভিউ** and **ডাউনলোড** actions. The preview opens `/api/receipts/{payment_id}` in a new tab, and download uses the existing `download=1` route option.

The success summary also stores an allocation snapshot before resetting the form, preventing the allocated/unallocated values from becoming stale or zero after reset.

## Changed files

- `app/payments/page.tsx`
- `app/api/payments/route.ts`
- `app/api/receipts/[id]/route.ts`
- `supabase/migrations/20260908_extra_amount_and_receipt.sql`

## Validation

- `npm run test:ledger`: **28/28 passed**
- `npm run lint`: **passed**
- `npx tsc --noEmit`: **passed**
- `git diff --check`: **passed**
- `npm run build`: application compilation passed, but page-data collection is blocked in the current sandbox because native `canvas.node` is unavailable. This is an existing environment/deployment dependency issue, not a TypeScript or lint failure.

Apply the new Supabase migration before using the feature in production. The production environment must also install/build the native `canvas` dependency for receipt generation.
