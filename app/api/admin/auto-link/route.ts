import { createClient as createSupaClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';

/**
 * POST /api/admin/auto-link
 * Links users to member records by phone number, so a member's account sees
 * their own donations (RLS: users.member_id -> donations.member_id).
 *
 * The link lives on USERS.MEMBER_ID — members has no user_id column (it was
 * removed to stop PostgREST FK ambiguity). The previous implementation still
 * wrote members.user_id, which always failed, yet returned success with
 * linkedCount 0.
 */
function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("880")) return "0" + digits.slice(3);
  return digits;
}

export async function POST() {
  const auth = await requireAuth('admin');
  if (!auth.ok) return auth.response;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createSupaClient(supabaseUrl, supabaseServiceKey);

    const { data: members, error: membersError } = await adminClient
      .from('members')
      .select('id, phone');
    if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });

    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('id, phone, member_id');
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

    // Members already claimed by some account must never be linked twice.
    const claimed = new Set(
      (users || []).filter(u => u.member_id).map(u => u.member_id as string)
    );
    const memberByPhone = new Map<string, string>();
    for (const member of members || []) {
      const key = normalizePhone(member.phone);
      if (!key || claimed.has(member.id)) continue;
      if (!memberByPhone.has(key)) memberByPhone.set(key, member.id);
    }

    let linkedCount = 0;
    for (const user of users || []) {
      if (user.member_id) continue;
      const memberId = memberByPhone.get(normalizePhone(user.phone));
      if (!memberId) continue;

      const { error: updateError } = await adminClient
        .from('users')
        .update({ member_id: memberId })
        .eq('id', user.id);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      claimed.add(memberId);
      linkedCount++;
    }

    return NextResponse.json({ success: true, linkedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
