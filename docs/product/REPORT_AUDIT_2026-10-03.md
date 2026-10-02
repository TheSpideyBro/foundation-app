# Report System Audit — 2026-10-03

## Inventory: 4 ta report view ache

| # | Page | Route | Sections | Lines |
|---|------|-------|----------|-------|
| 1 | ড্যাশবোর্ড | `/dashboard` | সংগ্রহের সারাংশ, সর্বশেষ ঘোষণা, ফাউন্ডেশন স্ট্যাটাস | 223 |
| 2 | প্রতিবেদন | `/reports` | 5 tabs: জমা, ব্যয়, সদস্য, আদায়কারী, এই মাসে যারা দিয়েছেন + Excel/PDF/CSV export | 311 |
| 3 | অ্যানালিটিক্স | `/analytics` | KPI cards, মাসিক ট্রেন্ড, বকেয়া তালিকা, আদায়কারী পারফরম্যান্স, পূর্বাভাস | 618 |
| 4 | ক্যাশ বই | `/cashbook` | Chronological জমা+খরচ+ব্যাংক ডিপোজিট, running balance | ~200 |

## Overlap Map (duplicate data)

| Data | Kothay kothay dekhay |
|------|---------------------|
| মাসিক সংগ্রহের সংখ্যা | Dashboard (সংগ্রহের সারাংশ) ↔ Analytics (KPI cards) — **same numbers, 2 jayga** |
| Donation list | `/donations` page ↔ Reports → জমা রিপোর্ট tab — **pure duplicate** |
| Expense list | `/expenses` page ↔ Reports → ব্যয় রিপোর্ট tab — **pure duplicate** |
| Member list | `/members` page ↔ Reports → সদস্য রিপোর্ট tab — **pure duplicate** |
| Collector stats | Reports → আদায়কারী রিপোর্ট ↔ Analytics → আদায়কারী পারফরম্যান্স — **same data, 2 view** |
| জমা+খরচ chronological | Cashbook ↔ Reports (জমা+ব্যয় tabs) — cashbook better (running balance + bank deposit shoho) |

## Unique value (konta kothay shudhu ache)

| Feature | Shudhu kothay |
|---------|---------------|
| মাসিক আদায় ট্রেন্ড chart | Analytics |
| বকেয়া তালিকা (defaulter) | Analytics |
| পূর্বাভাস (forecast) | Analytics |
| Running balance cashbook | Cashbook |
| Excel/PDF/CSV export | Reports |
| এই মাসে যারা দিয়েছেন | Reports |

## Recommendation

### SHORAO (dorkar nai)
1. **Reports page-er 3-ta tab** (জমা/ব্যয়/সদস্য) — Donations/Expenses/Members page-er pure duplicate. Export button main page gulotei add kora jay.
2. **Analytics-er KPI cards** — Dashboard-er সংগ্রহের সারাংশ-er duplicate. Ekta jaygay thaklei hoy.

### RAKHO (unique value ache)
1. **Dashboard** — entry point, clean summary
2. **Cashbook** — treasurer-er main workflow, Excel match kore
3. **Analytics** (KPI chara) — trend, defaulter, forecast unique
4. **Export** — Reports theke main page-e move koro

### MERGE koro
- Reports → shudhu export + "এই মাসে যারা দিয়েছেন" rakho, baki tab shorao
- Othoba Reports page tai shoriye export button Donations/Expenses page-e dao

## Impact
- Sidebar theke 1-ta item kombe (প্রতিবেদন → optional)
- ~300 line duplicate code kombe
- User confusion kombe (ekoi data 3 jaygay na)
