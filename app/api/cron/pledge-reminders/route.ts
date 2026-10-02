import { NextResponse } from "next/server";
import { createClient as createSupaClient } from "@supabase/supabase-js";
import {
  sendPledgeReminder,
  alreadyReminded,
} from "@/lib/reminder-notify";

/**
 * F5 — automatic monthly pledge reminders.
 *
 * Vercel Cron (see vercel.json) calls this on the 5th of each month.
 * For every active member whose previous-month pledge is still unpaid,
 * sends a WhatsApp reminder — unless one was already sent for that month.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
 * automatically when the CRON_SECRET env var is set. No other auth.
 */

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey =
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createSupaClient(supabaseUrl, supabaseServiceKey);
}

/** Previous month as YYYY-MM. */
function previousMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET কনফিগার করা নেই" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "অননুমোদিত" }, { status: 401 });
  }

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase কনফিগার করা নেই" },
      { status: 500 }
    );
  }

  const month = previousMonth();
  const summary = { month, total: 0, sent: 0, failed: 0, skipped: 0 };

  try {
    // Active members with a positive pledge.
    const { data: members, error: mErr } = await supabase
      .from("members")
      .select("id, name, phone, monthly_pledge")
      .eq("status", "active");
    if (mErr) throw mErr;

    // Paid per member for the target month (canonical: pledge+advance).
    const { data: allocs, error: aErr } = await supabase
      .from("payment_allocations")
      .select("member_id, amount")
      .eq("month", month)
      .in("allocation_type", ["pledge", "advance"]);
    if (aErr) throw aErr;

    const paidByMember = new Map<string, number>();
    for (const a of allocs || []) {
      const k = (a as { member_id: string }).member_id;
      paidByMember.set(
        k,
        (paidByMember.get(k) || 0) + Number((a as { amount: number }).amount || 0)
      );
    }

    for (const m of members || []) {
      const member = m as {
        id: string;
        name: string | null;
        phone: string | null;
        monthly_pledge: number | string | null;
      };
      const pledge = Math.max(0, Math.round(Number(member.monthly_pledge) || 0));
      if (pledge <= 0) continue;
      const paid = paidByMember.get(member.id) || 0;
      const due = pledge - paid;
      if (due <= 0.5) continue; // fully paid — no reminder needed
      summary.total += 1;

      if (await alreadyReminded(supabase, member.id, month)) {
        summary.skipped += 1;
        continue;
      }

      const res = await sendPledgeReminder({
        supabase,
        memberId: member.id,
        month,
        member,
        dueAmount: Math.round(due),
        sentBy: null, // automatic
      });
      if (res.status === "sent") summary.sent += 1;
      else if (res.status === "failed") summary.failed += 1;
      else summary.skipped += 1;
    }

    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[cron/pledge-reminders]", err);
    return NextResponse.json(
      { error: "রিমাইন্ডার চালাতে সমস্যা হয়েছে", ...summary },
      { status: 500 }
    );
  }
}
