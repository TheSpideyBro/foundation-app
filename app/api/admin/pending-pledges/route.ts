import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
    // 1. Get all active members with pledges
    const { data: members, error: mError } = await supabase
      .from("members")
      .select("id, name, phone, monthly_pledge")
      .eq("status", "active")
      .gt("monthly_pledge", 0);

    if (mError) throw mError;

    // 2. Get all donations for this month
    const { data: donations, error: dError } = await supabase
      .from("donations")
      .select("member_id, amount")
      .eq("donation_month", month);

    if (dError) throw dError;

    // 3. Calculate pending
    const donationMap = new Map();
    donations?.forEach(d => {
      const current = donationMap.get(d.member_id) || 0;
      donationMap.set(d.member_id, current + Number(d.amount));
    });

    const pending = members?.map(m => {
      const paid = donationMap.get(m.id) || 0;
      const pledge = Number(m.monthly_pledge);
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
