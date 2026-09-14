import { createClient as createSupaClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) throw new Error("Service role key missing");

    // Auth via the canonical server client (reads the @supabase/ssr session
    // cookie; the manual base64- parsing it replaced always 401'd on v0.12).
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createSupaClient(supabaseUrl, supabaseServiceKey);
    
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
