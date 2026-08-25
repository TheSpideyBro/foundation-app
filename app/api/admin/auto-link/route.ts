import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) throw new Error("Service role key missing");

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.getAll().find((c) => /^sb-.*-auth-token$/.test(c.name));
    let rawToken = tokenCookie?.value || "";
    let accessToken = rawToken;
    if (rawToken.startsWith("base64-")) {
      try {
        const json = Buffer.from(rawToken.slice(7), "base64url").toString("utf8");
        const parsed = JSON.parse(json);
        accessToken = typeof parsed?.access_token === "string" ? parsed.access_token : "";
      } catch { accessToken = ""; }
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Get all members who are not linked
    const { data: unlinkedMembers } = await adminClient
      .from('members')
      .select('id, phone')
      .is('user_id', null);

    if (!unlinkedMembers || unlinkedMembers.length === 0) {
      return NextResponse.json({ success: true, linkedCount: 0 });
    }

    // 2. Get all users who have phone numbers
    const { data: allUsers } = await adminClient
      .from('users')
      .select('id, phone')
      .not('phone', 'is', null);

    let linkedCount = 0;
    for (const member of unlinkedMembers) {
      const matchingUser = allUsers?.find(u => u.phone === member.phone);
      if (matchingUser) {
        await adminClient
          .from('members')
          .update({ user_id: matchingUser.id })
          .eq('id', member.id);
        linkedCount++;
      }
    }

    return NextResponse.json({ success: true, linkedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
