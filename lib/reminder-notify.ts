/**
 * F5 — pledge reminders.
 *
 * Single entry point for sending a monthly-pledge reminder over WhatsApp
 * and recording the attempt in the `reminder_log` table. Used by:
 *   - POST /api/cron/pledge-reminders (automatic monthly run)
 *   - POST /api/notify/reminder (manual send by staff)
 *
 * Mirrors lib/receipt-notify.ts: never throws for delivery problems —
 * returns a status and always writes a log row (sent / failed / skipped).
 * Only unexpected programmer errors throw.
 */

import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { monthLabelBengali } from "@/lib/utils";

export type ReminderChannel = "whatsapp";
export type ReminderStatus = "sent" | "failed" | "skipped";

export type ReminderResult = {
  status: ReminderStatus;
  /** Human-readable reason (Bengali) for failed/skipped. */
  detail?: string;
};

type SupabaseLike = {
  from: (table: string) => any;
};

/**
 * Build the reminder text. Short on purpose — WhatsApp truncates long
 * messages. Mentions the month and the due amount.
 */
export function buildReminderText(opts: {
  memberName: string;
  month: string; // YYYY-MM
  dueAmount: number;
}): string {
  const monthLabel = monthLabelBengali(opts.month);
  return [
    `আসসালামু আলাইকুম ${opts.memberName},`,
    `${monthLabel} মাসের মাসিক দান ৳${opts.dueAmount} এখনও বকেয়া আছে।`,
    `সুবিধামতো সময়ে জমা দেওয়ার অনুরোধ রইল।`,
    `— দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন`,
  ].join("\n");
}

async function logAttempt(
  supabase: SupabaseLike,
  row: {
    member_id: string;
    month: string;
    channel: ReminderChannel;
    recipient: string;
    status: ReminderStatus;
    error?: string | null;
    sent_by?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("reminder_log").insert({
      member_id: row.member_id,
      month: row.month,
      channel: row.channel,
      recipient: row.recipient,
      status: row.status,
      error: row.error ?? null,
      sent_by: row.sent_by ?? null,
    });
  } catch (err) {
    // Logging must never break the reminder run.
    console.error("[reminder-notify] log insert failed:", err);
  }
}

export async function sendPledgeReminder(opts: {
  /** Service-role or staff-scoped client (RLS policies allow staff insert). */
  supabase: SupabaseLike;
  memberId: string;
  /** YYYY-MM the reminder is about. */
  month: string;
  channel?: ReminderChannel;
  /** Staff user id for manual sends; null = automatic (cron). */
  sentBy?: string | null;
  /** Pre-fetched member row. Fetched when omitted. */
  member?: {
    id: string;
    name: string | null;
    phone: string | null;
    monthly_pledge: number | string | null;
  };
  /** Pre-computed due amount for the month. Defaults to monthly_pledge. */
  dueAmount?: number;
}): Promise<ReminderResult> {
  const channel: ReminderChannel = opts.channel ?? "whatsapp";

  let member = opts.member;
  if (!member) {
    const { data, error } = await opts.supabase
      .from("members")
      .select("id, name, phone, monthly_pledge")
      .eq("id", opts.memberId)
      .maybeSingle();
    if (error || !data) {
      return { status: "failed", detail: "সদস্যের তথ্য পাওয়া যায়নি" };
    }
    member = data;
  }
  // Narrow for TS: the early return above guarantees member is set.
  if (!member) {
    return { status: "failed", detail: "সদস্যের তথ্য পাওয়া যায়নি" };
  }
  const m = member;
  const phone: string | null = m.phone ?? null;
  const name = m.name || "সদস্য";
  const dueAmount =
    opts.dueAmount ?? Math.max(0, Math.round(Number(m.monthly_pledge) || 0));

  if (!phone) {
    await logAttempt(opts.supabase, {
      member_id: m.id,
      month: opts.month,
      channel,
      recipient: "",
      status: "skipped",
      error: "সদস্যের ফোন নম্বর নেই",
      sent_by: opts.sentBy ?? null,
    });
    return { status: "skipped", detail: "সদস্যের ফোন নম্বর নেই" };
  }

  if (
    !process.env.WHATSAPP_ACCESS_TOKEN ||
    !process.env.WHATSAPP_PHONE_NUMBER_ID
  ) {
    await logAttempt(opts.supabase, {
      member_id: m.id,
      month: opts.month,
      channel,
      recipient: phone,
      status: "skipped",
      error: "WhatsApp কনফিগার করা নেই",
      sent_by: opts.sentBy ?? null,
    });
    return { status: "skipped", detail: "WhatsApp কনফিগার করা নেই" };
  }

  const text = buildReminderText({ memberName: name, month: opts.month, dueAmount });

  try {
    const res = await sendWhatsAppMessage(phone, text);
    const messageId: string | null =
      res?.messages?.[0]?.id ?? null;
    if (res && !res.error) {
      await logAttempt(opts.supabase, {
        member_id: m.id,
        month: opts.month,
        channel,
        recipient: phone,
        status: "sent",
        sent_by: opts.sentBy ?? null,
      });
      return { status: "sent" };
    }
    const errDetail =
      res?.error?.message || res?.error?.type || "পাঠানো যায়নি";
    await logAttempt(opts.supabase, {
      member_id: m.id,
      month: opts.month,
      channel,
      recipient: phone,
      status: "failed",
      error: String(errDetail).slice(0, 500),
      sent_by: opts.sentBy ?? null,
    });
    void messageId;
    return { status: "failed", detail: "WhatsApp পাঠানো যায়নি" };
  } catch (err) {
    await logAttempt(opts.supabase, {
      member_id: m.id,
      month: opts.month,
      channel,
      recipient: phone,
      status: "failed",
      error: err instanceof Error ? err.message.slice(0, 500) : "অজানা ত্রুটি",
      sent_by: opts.sentBy ?? null,
    });
    return { status: "failed", detail: "WhatsApp পাঠানো যায়নি" };
  }
}

/**
 * Has a reminder already been sent (status=sent) for this member+month?
 * Used by the cron to avoid spamming the same member twice.
 */
export async function alreadyReminded(
  supabase: SupabaseLike,
  memberId: string,
  month: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("reminder_log")
    .select("id")
    .eq("member_id", memberId)
    .eq("month", month)
    .eq("status", "sent")
    .limit(1);
  return (data?.length ?? 0) > 0;
}
