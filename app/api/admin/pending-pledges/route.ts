import { NextResponse } from 'next/server';
import { currentMonthStr } from "@/lib/utils";
import { requireAuth } from '@/lib/server-auth';
import { buildMemberLedger, type LedgerDonation, type PledgeHistoryEntry } from '@/lib/payment-ledger';

export async function GET(request: Request) {
  const auth = await requireAuth('admin');
  if (!auth.ok) return auth.response;

  const { supabase } = auth;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || currentMonthStr(); // YYYY-MM

  try {
    // 1. Load active members, their effective pledge history and all relevant payments.
    // Every active member is loaded: the arrears filter belongs after the
    // ledger resolves the pledge effective for the requested month, not on the
    // current members.monthly_pledge value.
    const { data: members, error: mError } = await supabase
      .from("members")
      .select("id, name, phone, monthly_pledge")
      .eq("status", "active");
    if (mError) throw mError;

    const { data: pledgeHistory, error: hError } = await supabase
      .from("member_pledge_history")
      .select("member_id, monthly_amount, effective_from_month")
      .order("effective_from_month", { ascending: true });
    if (hError) throw hError;

    // Legacy rows can have donation_month NULL (predating the
    // set_donation_month trigger) — exclude them explicitly rather than
    // silently dropping them through an IS NULL comparison.
    const { data: donations, error: dError } = await supabase
      .from("donations")
      .select("id, member_id, amount, date, donation_month, donation_end_month")
      .or(`donation_month.lte.${month},donation_month.is.null`);
    if (dError) throw dError;

    const pending = members?.map(m => {
      const memberHistory = ((pledgeHistory || []) as PledgeHistoryEntry[]).filter((entry) => entry.member_id === m.id);
      const memberDonations = ((donations || []) as LedgerDonation[]).filter((donation) => donation.member_id === m.id);
      const row = buildMemberLedger(memberDonations, Number(m.monthly_pledge) || 0, month, month, memberHistory)[0];
      const pledge = row?.expected ?? (Number(m.monthly_pledge) || 0);
      const paid = row?.paid || 0;
      return {
        id: m.id,
        name: m.name,
        phone: m.phone,
        pledge,
        paid,
        remaining: Math.max(0, pledge - paid),
        status: paid >= pledge ? 'paid' : (paid > 0 ? 'partial' : 'unpaid')
      };
    }).filter(p => p.status !== 'paid');

    return NextResponse.json({ month, pending });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
