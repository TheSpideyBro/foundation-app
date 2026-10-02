import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";

/**
 * GET /api/accounts/[id] — account detail + transaction statement
 *   ?limit=  — max transactions (default 100, max 500)
 *
 * Returns the account, its current balance, and transactions newest-first
 * with a running balance column computed server-side.
 */

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("staff");
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { data: account, error: accError } = await auth.supabase
    .from("account_balances")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (accError) return fail(500, "হিসাবের তথ্য আনা যায়নি");
  if (!account) return fail(404, "হিসাব পাওয়া যায়নি");

  const url = new URL(request.url);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_LIMIT)
  );

  const { data: txns, error: txnError } = await auth.supabase
    .from("account_transactions")
    .select("id, date, direction, amount, particulars, remarks, transfer_id, created_at")
    .eq("account_id", id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (txnError) return fail(500, "লেনদেনের তালিকা আনা যায়নি");

  // Running balance newest-first: start from current, walk backwards.
  let running = Number(account.current_balance);
  const withBalance = (txns ?? []).map((t) => {
    const row = { ...t, balance_after: running };
    running += t.direction === "in" ? -Number(t.amount) : Number(t.amount);
    return row;
  });

  return NextResponse.json({
    account,
    transactions: withBalance,
  });
}
