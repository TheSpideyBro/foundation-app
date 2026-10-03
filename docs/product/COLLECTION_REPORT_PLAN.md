# Monthly Collection + Member Totals — Implementation Plan

## Ja dorkar (Akash-er requirement)

1. **Kon mash-e koto collection hoise** (monthly totals)
2. **Individual member-der total given amount** (member lifetime totals)

## Kothay implement korle bhalo (amar recommendation)

### 1. Monthly Collection → Analytics page (সবচেয়ে ভালো জায়গা)

**Keno Analytics?**
- Already ache "মাসিক আদায় ট্রেন্ড" chart — tar niche detailed table boshale perfect
- Insights-er page — monthly breakdown ekhanei manay
- Dashboard simple rakhte chai (shudhu latest info)

**Ki add korbo:**
```
মাসিক সংগ্রহ তালিকা (table)
| মাস | সংগ্রহ | লক্ষ্য | হার |
| অক্টোবর ২০২৬ | ৳5,000 | ৳4,400 | 114% |
| সেপ্টেম্বর ২০২৬ | ৳4,200 | ৳4,400 | 95% |
...
```

### 2. Member Total Given → Members page (সবচেয়ে ভালো জায়গা)

**Keno Members page?**
- Member dekhte gelei tar total dekha jabe — alada page-e jawa lagbe na
- Sort kora jabe (ke beshi dise)

**Ki add korbo:**
- Member card-e "মোট দিয়েছেন: ৳X" line add
- Sort option: নাম / মোট অনুযায়ী

### 3. Bonus: Analytics-e "সদস্য অনুযায়ী সংগ্রহ" (optional)

Jodi Members page-e jayga kom hoy:
```
সদস্য অনুযায়ী মোট (table, sortable)
| # | সদস্য | মোট দিয়েছেন | মাস সংখ্যা |
| 8 | ফারুক আহমেদ | ৳600 | 6 |
...
```

## Improved Version (amar suggestion)

**Ekta "সংগ্রহ রিপোর্ট" section Analytics-e:**

```
📊 মাসিক সংগ্রহ
├── ট্রেন্ড চার্ট (already ache)
├── মাসিক তালিকা (NEW - table)
│   └── প্রতিটা মাসে click korle oi mash-er detail
│
👥 সদস্য সংগ্রহ  
├── মোট অনুযায়ী ranking (NEW - top 10)
├── সব সদস্যের তালিকা (NEW - sortable table)
│
📈 existing: বকেয়া, পূর্বাভাস, collector
```

**Data source:**
- Monthly: `payment_allocations` GROUP BY month SUM(amount)
- Member total: `payment_allocations` GROUP BY member_id SUM(amount)
- (payment_allocations-i source of truth — canonical)

## Implementation Steps

### Phase 1: Monthly table (Analytics)
1. `payment_allocations` theke month-wise SUM query
2. Trend chart-er niche table add koro
3. Month click → detail (optional)

### Phase 2: Member totals (Members page)
4. `payment_allocations` theke member-wise SUM query  
5. Member card-e "মোট: ৳X" show koro
6. Sort dropdown: নাম / মোট

### Phase 3 (optional): Member ranking (Analytics)
7. Top 10 contributors card

## Estimate
- Phase 1: 30 min
- Phase 2: 30 min
- Phase 3: 20 min
- **Total: ~1.5 hours**
