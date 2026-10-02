import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import {
  sendPledgeReminder,
} from "@/lib/reminder-notify";

/**
 * F5 — manual pledge reminder (staff only).
 *
 * POST { member_id: string, month?: "YYYY-MM" }
 * Sends a WhatsApp pledge reminder for the given month (defaults to the
 * previous month) and logs it to reminder_log. Unlike the cron, this does
 * not skip members who were already reminded — the staff member explicitly
 * asked for it.
 */

function previousMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const auth = await requireAuth("staff");
  if (!auth.ok) return auth.response;

  let body: { member_id?: string; month?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "বডি পড়া যায়নি" }, { status: 400 });
  }

  const memberId = body.member_id;
  const month =
    body.month && /^\d{4}-\d{2}$/.test(body.month)
      ? body.month
      : previousMonth();
  if (!memberId) {
    return NextResponse.json({ error: "member_id আবশ্যক" }, { status: 400 });
  }

  try {
    // Due for the month (canonical: pledge+advance counts as paid).
    const { data: member, error: mErr } = await auth.supabase
      .from("members")
      .select("id, name, phone, monthly_pledge")
      .eq("id", memberId)
      .maybeSingle();
    if (mErr || !member) {
      return NextResponse.json(
        { error: "সদস্য পাওয়া যায়নি" },
        { status: 404 }
      );
    }
    const pledge = Math.max(
      0,
      Math.round(Number((member as { monthly_pledge: number }).monthly_pledge) || 0)
    );
    const { data: allocs } = await auth.supabase
      .from("payment_allocations")
      .select("amount")
      .eq("member_id", memberId)
      .eq("month", month)
      .in("allocation_type", ["pledge", "advance"]);
    const paid = (allocs || []).reduce(
      (s: number, a: { amount: number }) => s + Number(a.amount || 0),
      0
    );
    const due = Math.max(0, Math.round(pledge - paid));

    const result = await sendPledgeReminder({
      supabase: auth.supabase,
      memberId,
      month,
      member: member as {
        id: string;
        name: string | null;
        phone: string | null;
        monthly_pledge: number | string | null;
      },
      dueAmount: due,
      sentBy: auth.userId,
    });

    return NextResponse.json({ ok: result.status !== "failed", ...result, month, dueAmount: due });
  } catch (err) {
    console.error("[api/notify/reminder]", err);
    return NextResponse.json(
      { error: "রিমাইন্ডার পাঠাতে সমস্যা হয়েছে" },
      { status: 500 }
    );
  }
}
