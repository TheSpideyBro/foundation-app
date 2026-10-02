# Report System Simplification Plan — 2026-10-03

## Goal
Pura app-e report system ekdom simple koro. Ek data ek jaygay. Kono duplicate nai.

## Current State (problem)

```
Dashboard          → সংগ্রহের সারাংশ (4 stat cards)
Analytics          → KPI cards (same 4 numbers!) + trend + defaulter + collector + forecast
Reports            → জমা tab (= /donations) + ব্যয় tab (= /expenses) + সদস্য tab (= /members)
                     + আদায়কারী tab (= Analytics collector) + paid-members tab
Cashbook           → জমা + খরচ + bank deposit (running balance)
```

**Problem:** Ekoi number 2-3 jaygay. User confused hoy kontay dekhbe.

## Target State (simple)

```
ড্যাশবোর্ড          → Entry point: 4 stat cards + ঘোষণা + স্ট্যাটাস (unchanged)
ক্যাশ বই            → Main financial view: chronological সব লেনদেন + running balance
                     (জমা + খরচ + ব্যাংক ডিপোজিট)
অ্যানালিটিক্স        → Shudhu unique insights:
                     - মাসিক আদায় ট্রেন্ড (chart)
                     - বকেয়া তালিকা (defaulter)
                     - পূর্বাভাস (forecast)
                     ❌ KPI cards shorao (dashboard-e ache)
প্রতিবেদন            → SHORIYE DAO (page tai delete)
                     - Export button → Donations page-e
                     - Export button → Expenses page-e
                     - "এই মাসে যারা দিয়েছেন" → Members page-e tab hishebe
                     - আদায়কারী রিপোর্ট → Analytics-ei ache
```

## Sidebar (after)

```
আমার হিসাব (member)
ড্যাশবোর্ড
সদস্য তালিকা
জমা এন্ট্রি
দান সংগ্রহ (+ export button)
খরচের হিসাব (+ export button)
ক্যাশ বই
ব্যাংক/ক্যাশ
অ্যানালিটিক্স (KPI chara)
প্রোফাইল
```

**1-ta item kombe** (প্রতিবেদন). 10 theke 9.

## Implementation Steps

### Phase 1: Analytics simplify
1. `app/analytics/page.tsx` theke KPI cards section remove koro (lines ~335-390)
2. Baki rakho: trend chart, defaulter list, collector performance, forecast

### Phase 2: Export move koro
3. Reports page-er Excel/CSV export logic `lib/export.ts`-e move koro (reusable)
4. Donations page-e "Export" button add koro
5. Expenses page-e "Export" button add koro
6. PDF export? — jsPDF Bengali tofu dekhay (known bug). Shudhu Excel/CSV rakho.

### Phase 3: Paid members move koro
7. "এই মাসে যারা দিয়েছেন" logic Members page-e tab hishebe add koro
   (othoba Analytics-er defaulter list-er pashe "paid" tab)

### Phase 4: Reports page delete
8. `app/reports/` folder delete koro
9. Sidebar theke "প্রতিবেদন" item shorao
10. `docs/product/FEATURE_MAP.md` update koro

### Phase 5: Docs
11. `CHANGELOG.md` [Unreleased] update
12. `COMMIT_LOG.md` entry
13. `REPORT_AUDIT_2026-10-03.md` → implemented mark koro

## What stays where (final)

| Dekhte chao | Kothay jao |
|-------------|-----------|
| Ajker summary | ড্যাশবোর্ড |
| Taka kothay gelo/elo | ক্যাশ বই |
| Ke baki ache | অ্যানালিটিক্স → বকেয়া |
| Trend kemon | অ্যানালিটিক্স → ট্রেন্ড |
| Excel download | দান সংগ্রহ / খরচ page-er Export button |
| Member list | সদস্য তালিকা |

## Risk
- PDF export drop kortesi (Bengali tofu bug) — Akash confirm korse? (age thekei broken chilo)
- Reports page delete — kono external link thakle bhangbe (unlikely)

## Estimate
- Phase 1: 15 min
- Phase 2: 30 min  
- Phase 3: 20 min
- Phase 4: 10 min
- Phase 5: 10 min
- **Total: ~1.5 hours**
