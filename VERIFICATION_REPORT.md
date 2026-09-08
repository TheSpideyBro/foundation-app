# Foundation App Verification Report

## Scope

The repository was synchronized from `main` at commit `60297bf` and all development work was performed on `dev`. The final merged commit is `34bf812b261bdf9e3d08501b84a8e41ee6fe984b`; both `origin/dev` and `origin/main` point to that commit.

## Changes

The Joma Entry/payment flow now uses the authenticated `/api/payments` endpoint and the transactional Supabase RPC instead of direct client-side donation writes. Regular amount and Extra Amount are validated as finite numeric values, duplicate submits are ignored while a request is active, and edit/reallocation preserves Extra Amount without double-counting it. The success UI shows total cash, Extra Amount, allocated amount, unallocated amount, and receipt number, with receipt preview and download actions.

The misleading custom allocation controls were removed from `/payments` because that UI was not persisted by the API. Reports now select and export `extra_amount` explicitly. The ledger test runner uses explicit ESM mode to remove the module-type warning without changing the Next.js module configuration. Native `canvas` remains the supported receipt renderer and the production build succeeds in a clean npm install.

## Changed files

| File | Change |
| --- | --- |
| `app/api/payments/route.ts` | Strict amount validation; Extra Amount-aware POST and PUT/reallocation payloads. |
| `app/donations/page.tsx` | Atomic API submission, Extra Amount field, edit preservation, detailed success summary, preview/download actions. |
| `app/payments/page.tsx` | Removed non-persisted custom allocation UI and state. |
| `app/reports/page.tsx` | Explicitly loads and exports Extra Amount. |
| `package.json` | Explicit ESM mode for ledger tests. |
| `supabase/migrations/20260908_repair_payment_allocations_and_extra_amount.sql` | Repository migration documenting the live schema/RPC repair. |
| `VERIFICATION_REPORT.md` | This report. |

## Database migrations

Already present in the live project: `extra_amount_and_receipt`.

Applied during this task to the live project `mlnzxhuozuyidpxepxex`:

1. `repair_payment_allocations_table` — created `payment_allocations`, indexes, RLS policies, grants, and ensured `donations.note`/`donations.extra_amount` exist.
2. `repair_payment_allocation_functions` — installed the canonical allocation function and Extra Amount-aware `save_payment_entry` and `reallocate_payment` RPCs.

Live verification confirmed the `payment_allocations` table and the following RPC signatures, including Extra Amount in save/reallocation:

- `calculate_payment_allocation(uuid, uuid, numeric, text, text, jsonb)`
- `reallocate_payment(uuid, numeric, numeric, text, text, text)`
- `save_payment_entry(uuid, numeric, numeric, date, text, text, text, text, uuid, text, numeric, text, text)`

## Validation

| Command | Result |
| --- | --- |
| `npm run test:ledger` | PASS — 28 tests. |
| `npm run lint` | PASS. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS; native `canvas` loaded successfully and all Next.js routes compiled. |
| `git diff --check` | PASS. |
| `npm run test:verify` | PARTIAL — 5/9 checks passed in the local no-environment mock run; failures were caused by missing Supabase environment values and the mock assumptions in the existing script. |
| `npm run test:e2e` | NOT COMPLETED — the local server from `test:verify` occupied port 3001. |

The latest Vercel production deployment was inspected, but the browser session redirected to Vercel login. No authenticated application session was available, so no real payment was created and no live receipt preview/download was claimed as verified. The live database schema and RPCs were verified without inserting a test payment.

## Remaining limitations

The Vercel deployment must be redeployed from the final commit and its environment must contain the Supabase URL, anon key, and server-only service-role key. An authenticated admin/treasurer browser session is still required for final manual verification of one normal payment, one payment with Extra Amount, negative Extra Amount rejection, receipt preview, and receipt download. Next.js 16 still emits the non-blocking deprecation warning recommending `proxy` instead of `middleware`; migration was not attempted because authentication/routing behavior should be regression-tested on the deployed environment first.

No RLS policy was weakened and no service-role credential was added to client code.
