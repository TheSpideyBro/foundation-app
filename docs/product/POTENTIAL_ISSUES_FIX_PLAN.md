# Potential Issues — Fix Plan

## Issue 3: Dashboard bank balance — inefficient queries

**Problem:**
- Bank outflows alada query-te ana hoy (Promise.all-er baire)
- 2 round-trip instead of 1

**Fix:**
- Outflows query-ta Promise.all-er vitore nao
- Ekoi pattern-e bank in/out ekshathe ano

**File:** `app/dashboard/page.tsx` (fetchDashboardData)

**Estimate:** 10 min

---

## Issue 4: Cashbook `b-` prefix — fragile identification

**Problem:**
- Bank deposits-ke `id.startsWith("b-")` diye chinhito kora hoy
- ID prefix-er upor nirbhor — future-e kono ID `b-` diye shuru hole bhul hobe
- Donation = `d-`, Expense = `e-`, Bank = `b-` (convention, kintu enforce kora na)

**Fix (Option A — recommended):**
- Entry type-e explicit `source` field add koro: `"donation" | "expense" | "bank_deposit"`
- Prefix-er bodle `source` diye filter koro

**Fix (Option B — quick):**
- Prefix convention-ta comment-e document koro, as-is rakho

**File:** `app/cashbook/page.tsx`

**Estimate:** Option A: 15 min | Option B: 2 min

---

## Issue 5: schema.sql not regenerated

**Problem:**
- `member_code` migration apply hoise kintu `supabase/schema.sql` regenerate kora hoy nai
- AGENTS.md rule: migration apply korle schema.sql regenerate korte hobe

**Fix:**
```bash
SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=mlnzxhuozuyidpxepxex \
  python3 scripts/dump-supabase-schema.py > supabase/schema.sql
```
- Token lagbe (Akash-er kache)
- Tarpor SCHEMA.md-teo member_code already add kora ache (verify koro)

**Estimate:** 5 min (+ token wait time)

---

## Priority

| # | Issue | Priority | Keno |
|---|-------|----------|------|
| 5 | schema.sql | **High** | AGENTS.md rule, docs out of sync |
| 4 | b- prefix | **Medium** | Kaaj kore, kintu fragile |
| 3 | Dashboard queries | **Low** | Kaaj kore, shudhu slow |

## Recommended order
1. schema.sql regenerate (token pele)
2. Cashbook source field (Option A)
3. Dashboard query optimize
