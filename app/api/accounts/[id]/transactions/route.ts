import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/server-auth";

/**
 * POST /api/accounts/[id]/transactions — record a transaction
 *
 * Body:
 *   { kind: "in" | "out" | "transfer",
 *     amount: number, date?: "YYYY-MM-DD",
 *     particulars: string, remarks?: string,
 *     to_account_id?: string }   // required when kind = "transfer"
 *
 * - "in":  money comes INTO this account (জমা)
 * - "out": money goes OUT of this account (খরচ)
 * - "transfer": paired out (this account) + in (to_account_id),
 *   linked by one transfer_id. Both rows insert atomically.
 */

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("staff");
  if (!auth.ok) return auth.response;
  const { id: accountId } = await params;

  let body: {
    kind?: string;
    amount?: number;
    date?: string;
    particulars?: string;
    remarks?: string;
    to_account_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return fail(400, "অনুরোধের তথ্য সঠিক নয়");
  }

  const kind = body.kind;
  const amount = Number(body.amount);
  const date = body.date || new Date().toISOString().slice(0, 10);
  const particulars = (body.particulars ?? "").trim();
  const remarks = (body.remarks ?? "").trim() || null;

  if (kind !== "in" && kind !== "out" && kind !== "transfer")
    return fail(400, "ধরন in, out অথবা transfer হতে হবে");
  if (!Number.isFinite(amount) || amount <= 0)
    return fail(400, "টাকার পরিমাণ সঠিক নয়");
  if (amount > 999999999) return fail(400, "টাকার পরিমাণ অনেক বেশি");
  if (!isRealDate(date)) return fail(400, "তারিখ সঠিক নয়");
  if (!particulars) return fail(400, "বিবরণ দিন");
  if (particulars.length > 200) return fail(400, "বিবরণ ২০০ অক্ষরের বেশি হতে পারে না");

  // Source account must exist and be active.
  const { data: source, error: srcError } = await auth.supabase
    .from("accounts")
    .select("id, is_active")
    .eq("id", accountId)
    .maybeSingle();
  if (srcError) return fail(500, "হিসাব যাচাই করা যায়নি");
  if (!source) return fail(404, "হিসাব পাওয়া যায়নি");
  if (!source.is_active) return fail(400, "বন্ধ হিসাবে লেনদেন করা যাবে না");

  const rows: Record<string, unknown>[] = [];

  if (kind === "transfer") {
    const toId = body.to_account_id;
    if (!toId) return fail(400, "ট্রান্সফারের গন্তব্য হিসাব দিন");
    if (toId === accountId) return fail(400, "একই হিসাবে ট্রান্সফার করা যাবে না");

    const { data: dest, error: destError } = await auth.supabase
      .from("accounts")
      .select("id, is_active")
      .eq("id", toId)
      .maybeSingle();
    if (destError) return fail(500, "গন্তব্য হিসাব যাচাই করা যায়নি");
    if (!dest) return fail(404, "গন্তব্য হিসাব পাওয়া যায়নি");
    if (!dest.is_active) return fail(400, "বন্ধ হিসাবে ট্রান্সফার করা যাবে না");

    const transferId = randomUUID();
    rows.push(
      {
        account_id: accountId,
        date,
        direction: "out",
        amount,
        particulars: `ট্রান্সফার — ${particulars}`,
        remarks,
        transfer_id: transferId,
        created_by: auth.userId,
      },
      {
        account_id: toId,
        date,
        direction: "in",
        amount,
        particulars: `ট্রান্সফার — ${particulars}`,
        remarks,
        transfer_id: transferId,
        created_by: auth.userId,
      }
    );
  } else {
    rows.push({
      account_id: accountId,
      date,
      direction: kind,
      amount,
      particulars,
      remarks,
      created_by: auth.userId,
    });
  }

  const { error } = await auth.supabase
    .from("account_transactions")
    .insert(rows);

  if (error) return fail(500, "লেনদেন সংরক্ষণ করা যায়নি");
  return NextResponse.json({ success: true });
}
