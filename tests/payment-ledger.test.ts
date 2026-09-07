import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMemberLedger,
  buildMemberLedgerFromAllocations,
  buildMonthlyCoverageSummary,
  resolvePledgeForMonth,
  calculatePaymentAllocation,
  monthRange,
  getCoverageMonths,
  type PledgeHistoryEntry,
  type PaymentAllocation,
  type AllocationResult,
} from "../lib/payment-ledger.ts";

// ─── Basic pledge resolution ─────────────────────────────────────────────────

test("resolves the latest effective pledge without changing historical months", () => {
  const history: PledgeHistoryEntry[] = [
    { member_id: "m1", monthly_amount: 1000, effective_from_month: "2026-08" },
    { member_id: "m1", monthly_amount: 200, effective_from_month: "2026-09" },
    { member_id: "m1", monthly_amount: 500, effective_from_month: "2027-01" },
  ];
  assert.equal(resolvePledgeForMonth("2026-08", 0, history), 1000);
  assert.equal(resolvePledgeForMonth("2026-10", 0, history), 200);
  assert.equal(resolvePledgeForMonth("2027-02", 0, history), 500);
});

// ─── Canonical allocation engine ─────────────────────────────────────────────

test("Case A: normal payment — pledge 500, payment 500, coverage Aug", () => {
  const result = calculatePaymentAllocation(500, "2026-08", "2026-08", 500);
  assert.equal(result.allocatedAmount, 500);
  assert.equal(result.unallocatedAmount, 0);
  assert.equal(result.allocations.length, 1);
  assert.equal(result.allocations[0].amount, 500);
  assert.equal(result.allocations[0].allocationType, "pledge");
});

test("Case B: extra cash without future coverage — pledge 500, payment 1000, coverage Aug", () => {
  const result = calculatePaymentAllocation(1000, "2026-08", "2026-08", 500);
  assert.equal(result.allocatedAmount, 500);
  assert.equal(result.unallocatedAmount, 500);
  assert.equal(result.allocations.length, 2);
  assert.equal(result.allocations[0].amount, 500);
  assert.equal(result.allocations[0].allocationType, "pledge");
  assert.equal(result.allocations[1].amount, 500);
  assert.equal(result.allocations[1].allocationType, "unallocated");
  assert.equal(result.allocations[1].month, null);
});

test("Case C: explicit future advance — pledge 500, payment 1000, coverage Aug-Sep", () => {
  const result = calculatePaymentAllocation(1000, "2026-08", "2026-09", 500);
  assert.equal(result.allocatedAmount, 1000);
  assert.equal(result.unallocatedAmount, 0);
  assert.equal(result.allocations.length, 2);
  assert.equal(result.allocations[0].amount, 500);
  assert.equal(result.allocations[1].amount, 500);
  assert.equal(result.allocations[0].allocationType, "pledge");
  assert.equal(result.allocations[1].allocationType, "pledge");
});

test("Case D: pledge changes within coverage — Aug 1000, Sep+ 200, payment 1400, Aug-Oct", () => {
  const history: PledgeHistoryEntry[] = [
    { member_id: "m1", monthly_amount: 1000, effective_from_month: "2026-08" },
    { member_id: "m1", monthly_amount: 200, effective_from_month: "2026-09" },
  ];
  const result = calculatePaymentAllocation(1400, "2026-08", "2026-10", 1000, history);
  assert.equal(result.allocatedAmount, 1400);
  assert.equal(result.unallocatedAmount, 0);
  assert.equal(result.allocations.length, 3);
  assert.equal(result.allocations[0].amount, 1000);
  assert.equal(result.allocations[1].amount, 200);
  assert.equal(result.allocations[2].amount, 200);
});

test("Case E: same payment amount but August only — pledge Aug 1000, Sep+ 200, payment 1400, Aug only", () => {
  const history: PledgeHistoryEntry[] = [
    { member_id: "m1", monthly_amount: 1000, effective_from_month: "2026-08" },
    { member_id: "m1", monthly_amount: 200, effective_from_month: "2026-09" },
  ];
  const result = calculatePaymentAllocation(1400, "2026-08", "2026-08", 1000, history);
  assert.equal(result.allocatedAmount, 1000);
  assert.equal(result.unallocatedAmount, 400);
  assert.equal(result.allocations.length, 2);
  assert.equal(result.allocations[0].amount, 1000);
  assert.equal(result.allocations[0].allocationType, "pledge");
  assert.equal(result.allocations[1].amount, 400);
  assert.equal(result.allocations[1].allocationType, "unallocated");
  assert.equal(result.allocations[1].month, null);
});

test("Case F: partial payment — pledge 1000, payment 600", () => {
  const result = calculatePaymentAllocation(600, "2026-08", "2026-08", 1000);
  assert.equal(result.allocatedAmount, 600);
  assert.equal(result.unallocatedAmount, 0);
  assert.equal(result.allocations.length, 1);
  assert.equal(result.allocations[0].amount, 600);
  assert.equal(result.allocations[0].allocationType, "pledge");
});

test("Case G: multiple payments sum to exact pledge — 600 + 400 for Aug pledge 1000", () => {
  // First payment: 600 for Aug
  const r1 = calculatePaymentAllocation(600, "2026-08", "2026-08", 1000);
  assert.equal(r1.allocatedAmount, 600);
  assert.equal(r1.unallocatedAmount, 0);

  // Second payment: 400 for Aug
  const r2 = calculatePaymentAllocation(400, "2026-08", "2026-08", 1000);
  assert.equal(r2.allocatedAmount, 400);
  assert.equal(r2.unallocatedAmount, 0);
});

test("pledge change only affects months from effective date onward", () => {
  const history: PledgeHistoryEntry[] = [
    { member_id: "m1", monthly_amount: 1000, effective_from_month: "2026-08" },
    { member_id: "m1", monthly_amount: 200, effective_from_month: "2026-10" },
  ];
  // Payment Aug-Sep, pledge was 1000 in Aug and 1000 in Sep (change takes effect Oct)
  const result = calculatePaymentAllocation(2000, "2026-08", "2026-09", 1000, history);
  assert.equal(result.allocatedAmount, 2000);
  assert.equal(result.unallocatedAmount, 0);
  assert.equal(result.allocations[0].amount, 1000); // Aug at 1000
  assert.equal(result.allocations[1].amount, 1000); // Sep at 1000 (before Oct change)
});

test("zero payment results in all unallocated", () => {
  const result = calculatePaymentAllocation(0, "2026-08", "2026-08", 500);
  assert.equal(result.allocatedAmount, 0);
  assert.equal(result.unallocatedAmount, 0);
  assert.equal(result.allocations.length, 0);
});

test("negative amount is clamped to zero", () => {
  const result = calculatePaymentAllocation(-100, "2026-08", "2026-08", 500);
  assert.equal(result.allocatedAmount, 0);
  assert.equal(result.unallocatedAmount, 0);
  assert.equal(result.allocations.length, 0);
});

// ─── Ledger integration ──────────────────────────────────────────────────────

test("allocates one payment across months with different pledges", () => {
  const ledger = buildMemberLedger(
    [{ id: "d1", member_id: "m1", amount: 1400, date: "2026-08-01", donation_month: "2026-08", donation_end_month: "2026-10" }],
    0,
    "2026-08",
    "2026-10",
    [
      { member_id: "m1", monthly_amount: 1000, effective_from_month: "2026-08" },
      { member_id: "m1", monthly_amount: 200, effective_from_month: "2026-09" },
    ],
  );
  assert.deepEqual(ledger.map((row) => [row.month, row.expected, row.paid, row.status]), [
    ["2026-08", 1000, 1000, "paid"],
    ["2026-09", 200, 200, "paid"],
    ["2026-10", 200, 200, "paid"],
  ]);
  assert.equal(new Set(ledger.flatMap((row) => row.donations.map((d) => d.id))).size, 1);
});

test("keeps recurring pledge unchanged for a one-time extra contribution", () => {
  const ledger = buildMemberLedger(
    [{ id: "d1", member_id: "m1", amount: 1000, date: "2026-08-15", donation_month: "2026-08" }],
    500,
    "2026-08",
    "2026-08",
  );
  assert.equal(ledger[0].expected, 500);
  assert.equal(ledger[0].paid, 500);
  assert.equal(ledger[0].unallocated, 500);
  assert.equal(ledger[0].status, "overpaid");
});

test("handles partial payment and future advance coverage", () => {
  const partial = buildMemberLedger(
    [{ id: "d1", amount: 300, date: "2026-08-10", donation_month: "2026-08" }],
    500,
    "2026-08",
    "2026-08",
  )[0];
  assert.deepEqual([partial.expected, partial.paid, partial.remaining, partial.status], [500, 300, 200, "partial"]);

  const advance = buildMemberLedger(
    [{ id: "d2", amount: 1000, date: "2026-08-10", donation_month: "2026-08", donation_end_month: "2026-09" }],
    500,
    "2026-08",
    "2026-09",
  );
  assert.deepEqual(advance.map((row) => row.paid), [500, 500]);
  assert.deepEqual(advance.map((row) => row.unallocated), [0, 0]);
  assert.equal(advance[1].donations[0].date, "2026-08-10");
});

test("does not silently turn one-time extra cash into a future recurring advance", () => {
  const ledger = buildMemberLedger(
    [{ id: "d1", member_id: "m1", amount: 1000, date: "2026-08-15", donation_month: "2026-08" }],
    500,
    "2026-08",
    "2026-09",
  );

  assert.deepEqual(
    ledger.map((row) => [row.month, row.expected, row.paid, row.unallocated, row.status]),
    [
      ["2026-08", 500, 500, 500, "overpaid"],
      ["2026-09", 500, 0, 0, "due"],
    ],
  );
});

test("monthly summary uses member pledge history and coverage, not equal splitting", () => {
  const summary = buildMonthlyCoverageSummary(
    ["2026-08", "2026-09", "2026-10"],
    [{ id: "m1", monthly_pledge: 0, join_date: "2026-08-01", status: "active" }],
    [{ id: "d1", member_id: "m1", amount: 1400, date: "2026-08-10", donation_month: "2026-08", donation_end_month: "2026-10" }],
    [
      { member_id: "m1", monthly_amount: 1000, effective_from_month: "2026-08" },
      { member_id: "m1", monthly_amount: 200, effective_from_month: "2026-09" },
    ],
  );
  assert.deepEqual(summary.map((row) => [row.target_amount, row.collected_amount]), [[1000, 1000], [200, 200], [200, 200]]);
});

// ─── Spec end-to-end cases ──────────────────────────────────────────────────

test("Case D end-to-end: 1400 payment, Aug pledge 1000, Sep+ 200, coverage Aug-Oct", () => {
  const history: PledgeHistoryEntry[] = [
    { member_id: "m1", monthly_amount: 1000, effective_from_month: "2026-08" },
    { member_id: "m1", monthly_amount: 200, effective_from_month: "2026-09" },
  ];
  const result = calculatePaymentAllocation(1400, "2026-08", "2026-10", 1000, history);
  assert.equal(result.allocatedAmount, 1400);
  assert.equal(result.unallocatedAmount, 0);
  assert.deepEqual(
    result.allocations.map((a) => ({ month: a.month, amount: a.amount, type: a.allocationType })),
    [
      { month: "2026-08", amount: 1000, type: "pledge" },
      { month: "2026-09", amount: 200, type: "pledge" },
      { month: "2026-10", amount: 200, type: "pledge" },
    ],
  );
});

test("Case E end-to-end: 1400 payment, Aug pledge 1000, Sep+ 200, coverage Aug only", () => {
  const history: PledgeHistoryEntry[] = [
    { member_id: "m1", monthly_amount: 1000, effective_from_month: "2026-08" },
    { member_id: "m1", monthly_amount: 200, effective_from_month: "2026-09" },
  ];
  const result = calculatePaymentAllocation(1400, "2026-08", "2026-08", 1000, history);
  assert.equal(result.allocatedAmount, 1000);
  assert.equal(result.unallocatedAmount, 400);
  assert.deepEqual(
    result.allocations.map((a) => ({ month: a.month, amount: a.amount, type: a.allocationType })),
    [
      { month: "2026-08", amount: 1000, type: "pledge" },
      { month: null, amount: 400, type: "unallocated" },
    ],
  );
});

test("unallocated amount never appears as monthly paid", () => {
  const ledger = buildMemberLedger(
    [{ id: "d1", member_id: "m1", amount: 1000, date: "2026-08-07", donation_month: "2026-08" }],
    500,
    "2026-08",
    "2026-09",
  );
  // Aug should be allocated 500, unallocated 500, NOT paid 1000
  assert.equal(ledger.find((r) => r.month === "2026-08")!.paid, 500);
  assert.equal(ledger.find((r) => r.month === "2026-08")!.unallocated, 500);
  // Sep should be unaffected — still due
  assert.equal(ledger.find((r) => r.month === "2026-09")!.paid, 0);
  assert.equal(ledger.find((r) => r.month === "2026-09")!.status, "due");
});

test("report cash received differs from allocated amount", () => {
  // Payment of 1000 received in August, pledge 500, coverage Aug only
  const ledger = buildMemberLedger(
    [{ id: "d1", member_id: "m1", amount: 1000, date: "2026-08-07", donation_month: "2026-08" }],
    500,
    "2026-08",
    "2026-08",
  );
  const row = ledger[0];
  assert.equal(row.paid, 500);       // allocated
  assert.equal(row.unallocated, 500); // extra
  assert.equal(row.expected, 500);
  assert.equal(row.status, "overpaid");
});

test("coverage months derived from donation fields", () => {
  const d1 = { id: "a", member_id: "m", amount: 500, date: "2026-08-01", donation_month: "2026-08" };
  assert.deepEqual(getCoverageMonths(d1), ["2026-08"]);

  const d2 = { id: "b", member_id: "m", amount: 1000, date: "2026-08-01", donation_month: "2026-08", donation_end_month: "2026-10" };
  assert.deepEqual(getCoverageMonths(d2), ["2026-08", "2026-09", "2026-10"]);

  // coverage_start_month takes priority
  const d3 = { id: "c", member_id: "m", amount: 500, date: "2026-09-01", donation_month: "2026-09", coverage_start_month: "2026-08", coverage_end_month: "2026-08" };
  assert.deepEqual(getCoverageMonths(d3), ["2026-08"]);
});

test("monthRange utility works correctly", () => {
  assert.deepEqual(monthRange("2026-08", "2026-08"), ["2026-08"]);
  assert.deepEqual(monthRange("2026-08", "2026-10"), ["2026-08", "2026-09", "2026-10"]);
  // monthRange requires end >= start; cross-year wrap is handled by callers
  assert.deepEqual(monthRange("2026-12", "2026-02"), []);
  assert.deepEqual(monthRange("2026-08", "2027-02"), ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]);
});

// ─── Allocations-based ledger (payment_allocations source of truth) ──────────

test("builds ledger from persisted allocations — pledge counts as paid, unallocated is extra", () => {
  const allocations: PaymentAllocation[] = [
    { payment_id: "d1", member_id: "m1", month: "2026-08", amount: 500, allocation_type: "pledge" },
    { payment_id: "d1", member_id: "m1", month: null, amount: 500, allocation_type: "unallocated" },
  ];
  const donations = [
    { id: "d1", member_id: "m1", amount: 1000, date: "2026-08-10", coverage_start_month: "2026-08", coverage_end_month: "2026-08" },
  ];
  const ledger = buildMemberLedgerFromAllocations(allocations, donations, 500, "2026-08", "2026-08");
  assert.equal(ledger[0].expected, 500);
  assert.equal(ledger[0].paid, 500);
  assert.equal(ledger[0].unallocated, 500);
  assert.equal(ledger[0].remaining, 0);
  assert.equal(ledger[0].status, "overpaid");
});

test("persisted allocations never advance extra cash into a future month", () => {
  const allocations: PaymentAllocation[] = [
    { payment_id: "d1", member_id: "m1", month: "2026-08", amount: 500, allocation_type: "pledge" },
    { payment_id: "d1", member_id: "m1", month: null, amount: 500, allocation_type: "unallocated" },
  ];
  const donations = [
    { id: "d1", member_id: "m1", amount: 1000, date: "2026-08-10", coverage_start_month: "2026-08", coverage_end_month: "2026-08" },
  ];
  const ledger = buildMemberLedgerFromAllocations(allocations, donations, 500, "2026-08", "2026-09");
  assert.deepEqual(
    ledger.map((row) => [row.month, row.paid, row.unallocated, row.status]),
    [
      ["2026-08", 500, 500, "overpaid"],
      ["2026-09", 0, 0, "due"],
    ],
  );
});

test("persisted advance allocations spread across explicit coverage months", () => {
  const allocations: PaymentAllocation[] = [
    { payment_id: "d1", member_id: "m1", month: "2026-08", amount: 500, allocation_type: "pledge" },
    { payment_id: "d1", member_id: "m1", month: "2026-09", amount: 500, allocation_type: "pledge" },
  ];
  const donations = [
    { id: "d1", member_id: "m1", amount: 1000, date: "2026-08-10", coverage_start_month: "2026-08", coverage_end_month: "2026-09" },
  ];
  const ledger = buildMemberLedgerFromAllocations(allocations, donations, 500, "2026-08", "2026-09");
  assert.deepEqual(ledger.map((row) => [row.paid, row.unallocated, row.status]), [[500, 0, "paid"], [500, 0, "paid"]]);
});

test("falls back to canonical recompute for donations without persisted allocations", () => {
  // No allocations rows at all → legacy fallback recomputes canonically
  const donations = [
    { id: "d1", member_id: "m1", amount: 1000, date: "2026-08-10", donation_month: "2026-08" },
  ];
  const ledger = buildMemberLedgerFromAllocations([], donations, 500, "2026-08", "2026-09");
  assert.deepEqual(
    ledger.map((row) => [row.month, row.paid, row.unallocated, row.status]),
    [
      ["2026-08", 500, 500, "overpaid"],
      ["2026-09", 0, 0, "due"],
    ],
  );
});

test("handles mixed state — one donation backfilled, one legacy — without double counting", () => {
  const allocations: PaymentAllocation[] = [
    { payment_id: "d1", member_id: "m1", month: "2026-08", amount: 500, allocation_type: "pledge" },
  ];
  const donations = [
    { id: "d1", member_id: "m1", amount: 500, date: "2026-08-05", coverage_start_month: "2026-08", coverage_end_month: "2026-08" },
    { id: "d2", member_id: "m1", amount: 500, date: "2026-09-05", donation_month: "2026-09" }, // legacy, not backfilled
  ];
  const ledger = buildMemberLedgerFromAllocations(allocations, donations, 500, "2026-08", "2026-09");
  assert.deepEqual(ledger.map((row) => [row.month, row.paid, row.status]), [["2026-08", 500, "paid"], ["2026-09", 500, "paid"]]);
});

test("allocations-based ledger matches canonical recompute on the same data", () => {
  const donations = [
    { id: "d1", member_id: "m1", amount: 1400, date: "2026-08-01", coverage_start_month: "2026-08", coverage_end_month: "2026-10" },
  ];
  const history: PledgeHistoryEntry[] = [
    { member_id: "m1", monthly_amount: 1000, effective_from_month: "2026-08" },
    { member_id: "m1", monthly_amount: 200, effective_from_month: "2026-09" },
  ];
  const fromRecompute = buildMemberLedger(donations, 1000, "2026-08", "2026-10", history);
  const fromAllocations = buildMemberLedgerFromAllocations([], donations, 1000, "2026-08", "2026-10", history);
  assert.deepEqual(
    fromAllocations.map((row) => [row.month, row.expected, row.paid, row.unallocated]),
    fromRecompute.map((row) => [row.month, row.expected, row.paid, row.unallocated]),
  );
});
