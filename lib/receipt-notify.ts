/**
 * F3 — automatic receipt delivery.
 *
 * Single entry point for sending a donation receipt over WhatsApp and
 * recording the attempt in the `notifications` log table. Used by:
 *   - POST /api/payments (automatic, right after a জমা is saved)
 *   - POST /api/notify/whatsapp (manual resend by staff)
 *
 * The function never throws for delivery problems — it returns a status
 * and always writes a log row (sent / failed / skipped) so the donations
 * list can show delivery state. Only unexpected programmer errors throw.
 */

import { sendWhatsAppMessage } from "@/lib/whatsapp";

export type NotifyChannel = "whatsapp";
export type NotifyStatus = "sent" | "failed" | "skipped";

export type ReceiptNotifyResult = {
  status: NotifyStatus;
  /** Human-readable reason (Bengali) for failed/skipped. */
  detail?: string;
};

type SupabaseLike = {
  from: (table: string) => any;
};

/**
 * Build the receipt text. Keep it short: WhatsApp truncates long messages
 * and every segment costs. Amount uses Bengali digits via the caller.
 */
export function buildReceiptText(opts: {
  memberName: string;
  amount: number;
  date: string;
  receiptNo?: string | null;
  verifyUrl?: string | null;
}): string {
  const lines = [
    `আসসালামু আলাইকুম ${opts.memberName},`,
    `আপনার ৳${opts.amount} দান সফলভাবে জমা হয়েছে।`,
    `তারিখ: ${opts.date}`,
  ];
  if (opts.receiptNo) lines.push(`রসিদ নং: ${opts.receiptNo}`);
  if (opts.verifyUrl) lines.push(`রসিদ যাচাই: ${opts.verifyUrl}`);
  lines.push("ফাউন্ডেশনের সাথে থাকার জন্য ধন্যবাদ!");
  return lines.join("\n");
}

async function logAttempt(
  supabase: SupabaseLike,
  row: {
    donation_id: string;
    member_id: string | null;
    channel: NotifyChannel;
    recipient: string;
    status: NotifyStatus;
    provider_message_id?: string | null;
    error?: string | null;
    sent_by?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("notifications").insert({
      donation_id: row.donation_id,
      member_id: row.member_id,
      channel: row.channel,
      recipient: row.recipient,
      status: row.status,
      provider_message_id: row.provider_message_id ?? null,
      error: row.error ?? null,
      sent_by: row.sent_by ?? null,
    });
  } catch (err) {
    // Logging must never break the payment flow.
    console.error("[receipt-notify] log insert failed:", err);
  }
}

export async function sendReceiptNotification(opts: {
  /** Service-role or staff-scoped client (RLS policies allow staff insert). */
  supabase: SupabaseLike;
  donationId: string;
  channel?: NotifyChannel;
  /** Staff user id for manual resends; null = automatic on জমা. */
  sentBy?: string | null;
  /** Pre-fetched donation row (with members joined). Fetched when omitted. */
  donation?: any;
}): Promise<ReceiptNotifyResult> {
  const channel: NotifyChannel = opts.channel ?? "whatsapp";

  let donation = opts.donation;
  if (!donation) {
    const { data, error } = await opts.supabase
      .from("donations")
      .select("id, member_id, amount, date, receipt_no, members(id, name, phone)")
      .eq("id", opts.donationId)
      .maybeSingle();
    if (error || !data) {
      return { status: "failed", detail: "জমার তথ্য পাওয়া যায়নি" };
    }
    donation = data;
  }

  const member = donation.members ?? null;
  const memberId: string | null = donation.member_id ?? member?.id ?? null;
  const phone: string | null = member?.phone ?? null;

  if (!phone) {
    await logAttempt(opts.supabase, {
      donation_id: donation.id,
      member_id: memberId,
      channel,
      recipient: "",
      status: "skipped",
      error: "সদস্যের ফোন নম্বর নেই",
      sent_by: opts.sentBy ?? null,
    });
    return { status: "skipped", detail: "সদস্যের ফোন নম্বর নেই" };
  }

  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    await logAttempt(opts.supabase, {
      donation_id: donation.id,
      member_id: memberId,
      channel,
      recipient: phone,
      status: "skipped",
      error: "WhatsApp কনফিগার করা নেই",
      sent_by: opts.sentBy ?? null,
    });
    return { status: "skipped", detail: "WhatsApp কনফিগার করা নেই" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const verifyUrl =
    baseUrl && donation.receipt_no
      ? `${baseUrl}/verify/${encodeURIComponent(donation.receipt_no)}`
      : null;

  const text = buildReceiptText({
    memberName: member?.name || "সদস্য",
    amount: Number(donation.amount) || 0,
    date: String(donation.date || "").slice(0, 10),
    receiptNo: donation.receipt_no,
    verifyUrl,
  });

  try {
    const res = await sendWhatsAppMessage(phone, text);
    // Meta returns { messages: [{ id }] } on success; null/{} means the
    // utility bailed (shouldn't happen — creds were checked above).
    const providerId: string | null =
      res?.messages?.[0]?.id ?? res?.message_id ?? null;
    const ok = !!providerId || (res && !res.error);
    await logAttempt(opts.supabase, {
      donation_id: donation.id,
      member_id: memberId,
      channel,
      recipient: phone,
      status: ok ? "sent" : "failed",
      provider_message_id: providerId,
      error: ok ? null : `WhatsApp API error: ${JSON.stringify(res ?? null).slice(0, 300)}`,
      sent_by: opts.sentBy ?? null,
    });
    return ok
      ? { status: "sent" }
      : { status: "failed", detail: "WhatsApp পাঠানো যায়নি" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "অজানা ত্রুটি";
    await logAttempt(opts.supabase, {
      donation_id: donation.id,
      member_id: memberId,
      channel,
      recipient: phone,
      status: "failed",
      error: msg.slice(0, 500),
      sent_by: opts.sentBy ?? null,
    });
    return { status: "failed", detail: "WhatsApp পাঠানো যায়নি" };
  }
}
