# Final Consistency Audit

**Audit date:** 2026-09-08
**Auditor:** Claude Code
**Scope:** Code ↔ Database ↔ Documentation ↔ Git history
**Reference baseline:** [docs/audits/REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md)

## Invariant Checks

### 1. Accounting integrity (live DB)
| Check | Result |
|-------|--------|
| `SUM(payment_allocations.amount)` = `SUM(donations.amount)` | ✅ 7,442 = 7,442 |
| Allocation types used | ✅ only `pledge` (month NOT NULL) and `unallocated` (month NULL) |

### 2. Canonical engine parity (TS ↔ SQL)
| Check | Result |
|-------|--------|
| TS `resolvePledgeForMonth` precedence: history → monthly_pledge → 0 | ✅ verified in source |
| SQL `calculate_payment_allocation` same COALESCE chain | ✅ verified in migration `20260907_payment_allocations_member_pledge_fallback.sql` |
| TS `calculatePaymentAllocation` allocation loop logic matches SQL | ✅ verified |
| 28-case unit suite passes | ✅ `pnpm test:ledger` green |

### 3. Migration ↔ live database
| Check | Result |
|-------|--------|
| All 9 migration files present in `supabase/migrations/` | ✅ |
| Docs migration history table lists all 9 in order | ✅ |
| Live DB functions (`calculate_payment_allocation`, `save_payment_entry`, `reallocate_payment`, `backfill_payment_allocations`, `get_my_role`, `log_audit_event`) match docs | ✅ |
| Live DB view `monthly_collection_summary` derives from `payment_allocations` | ✅ |

### 4. Documentation ↔ code
| Reference | Status |
|-----------|--------|
| `CLAUDE.md` pointing to `/reference/*.jsx` | ✅ **FIXED this session** — files had been deleted in commit `bb47d30`; restored from initial commit `32dd635` |
| Feature map routes match actual `app/` files | ✅ spot-checked all 26 features |
| API routes documented all exist in `app/api/` | ✅ |
| `lib/` exports match docs (all 13 `export` declarations on `payment-ledger.ts` accounted for) | ✅ |
| Role matrix matches RLS policy intent + UI gates | ✅ |

### 5. Git history ↔ changelog
| Check | Result |
|-------|--------|
| Changelog phases map to real commit clusters | ✅ |
| BUG-001 documented against actual migration `20260907_payment_allocations_member_pledge_fallback.sql` | ✅ |
| ADR dates plausible vs commit dates | ✅ |

## Findings & Resolutions This Session

### F1 — Deleted design references (RESOLVED)
`reference/full-app-design.jsx` and `reference/receipt-design.jsx` were deleted in commit `bb47d30` (a Google Sheets sync commit — likely an unintended include in a broad cleanup), while `CLAUDE.md` still instructed all future UI work to consult them. **Resolved:** restored both from the initial commit; the "DO NOT DEVIATE" design directive is valid again.

### F2 — Stray debug artifacts at repo root (RESOLVED)
Git-tracked debugging leftovers (`check-*.json`, `fix-*.json`, `fix-rls.js`, `test-route.js`, `test-role-admin.json`, `verify-users.json`, `add-users-member-fk.json`, `remove-redundant-fk.json`, `check-ambiguity.json`, `test-receipt-final.jpg`) plus stale notes (`security-updates.md`, `docs/security-policies-fix.sql`) were removed in the cleanup commit. All are recoverable from git history.

### F3 — Root-level docs are now superseded by `docs/` (RESOLVED)
- `docs/WHATSAPP_SETUP.md` → moved to `docs/development/WHATSAPP_SETUP.md`
- `docs/google-sheets-setup.md` → moved to `docs/development/GOOGLE_SHEETS_SETUP.md`
- Both are linked from the root `README.md` quick-links table.
- `security-updates.md` (a one-off past update note) → removed; its content class if ever needed again is covered by `CHANGELOG.md` and the RLS policies in `supabase/migrations/`.

### F4 — TypeScript details verified
`next.config.ts` uses `ignoreBuildErrors: true` (TD-002). `middleware.ts` + root `app/middleware.ts` both exist (duplicate of the auth gate; noted, not changed).

## Conclusion

The repository, live database, and documentation are mutually consistent on every invariant that matters for financial correctness:

- **One** allocation algorithm across TS/SQL/UI/reports.
- **payment_allocations** is the single source of truth; zero-sum holds.
- **All 9 migrations** documented and applied in order to the live DB.
- **28 tests** pass; changelog, ADRs, BUG/TD trackers reflect real history.

All housekeeping findings (F1, F2, F3) are resolved. The remaining open items are the documented tech debts in [docs/decisions/TECH_DEBT.md](../decisions/TECH_DEBT.md), all of which are *tracked* so they can be resolved consciously.