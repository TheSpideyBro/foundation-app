import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";

/**
 * GET  /api/accounts          — list accounts with current balances
 * POST /api/accounts          — create a new bank/cash account
 *
 * Staff-only (admin/treasurer). Balances come from the account_balances view.
 */

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

export async function GET() {
  const auth = await requireAuth("staff");
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("account_balances")
    .select("*")
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) return fail(500, "হিসাবের তালিকা আনা যায়নি");
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuth("staff");
  if (!auth.ok) return auth.response;

  let body: { name?: string; type?: string; opening_balance?: number };
  try {
    body = await request.json();
  } catch {
    return fail(400, "অনুরোধের তথ্য সঠিক নয়");
  }

  const name = (body.name ?? "").trim();
  const type = body.type;
  const opening_balance = Number(body.opening_balance ?? 0);

  if (!name) return fail(400, "হিসাবের নাম দিন");
  if (name.length > 100) return fail(400, "নাম ১০০ অক্ষরের বেশি হতে পারে না");
  if (type !== "bank" && type !== "cash")
    return fail(400, "ধরন bank অথবা cash হতে হবে");
  if (!Number.isFinite(opening_balance) || opening_balance < 0)
    return fail(400, "প্রারম্ভিক ব্যালেন্স সঠিক নয়");

  const { data, error } = await auth.supabase
    .from("accounts")
    .insert({
      name,
      type,
      opening_balance,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (error) return fail(500, "হিসাব তৈরি করা যায়নি");
  return NextResponse.json({ success: true, id: data.id });
}
