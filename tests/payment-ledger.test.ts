import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMemberLedger,
  buildMonthlyCoverageSummary,
  resolvePledgeForMonth,
} from "../lib/payment-ledger.ts";

test("resolves the latest effective pledge without changing historical months", () => {
  const history = [
    { member_id: "m1", monthly_amount: 1000, effective_from_month: "2026-08" },
    { member_id: "m1", monthly_amount: 200, effective_from_month: "2026-09" },
    { member_id: "m1", monthly_amount: 500, effective_from_month: "2027-01" },
  ];
  assert.equal(resolvePledgeForMonth("2026-08", 0, history), 1000);
  assert.equal(resolvePledgeForMonth("2026-10", 0, history), 200);
  assert.equal(resolvePledgeForMonth("2027-02", 0, history), 500);
});

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
  assert.equal(new Set(ledger.flatMap((row) => row.donations.map((donation) => donation.id))).size, 1);
});

test("keeps recurring pledge unchanged for a one-time extra contribution", () => {
  const ledger = buildMemberLedger(
    [{ id: "d1", member_id: "m1", amount: 1000, date: "2026-08-15", donation_month: "2026-08" }],
    500,
    "2026-08",
    "2026-08",
  );
  assert.equal(ledger[0].expected, 500);
  assert.equal(ledger[0].paid, 1000);
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
  assert.equal(advance[1].donations[0].date, "2026-08-10");
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
