import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildMemberLedger, type LedgerDonation, type PledgeHistoryEntry } from "@/lib/payment-ledger";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (user?.role !== 'admin' && session.user.email !== 'saddamakash234@gmail.com') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM

  try {
    // 1. Load active members, their effective pledge history and all relevant payments.
    const { data: members, error: mError } = await supabase
      .from("members")
      .select("id, name, phone, monthly_pledge")
      .eq("status", "active")
      .gt("monthly_pledge", 0);
    if (mError) throw mError;

    const { data: pledgeHistory, error: hError } = await supabase
      .from("member_pledge_history")
      .select("member_id, monthly_amount, effective_from_month")
      .order("effective_from_month", { ascending: true });
    if (hError) throw hError;

    const { data: donations, error: dError } = await supabase
      .from("donations")
      .select("id, member_id, amount, date, donation_month, donation_end_month")
      .lte("donation_month", month);
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
