import { createClient as createSupaClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: Request) {
  try {
    const auth = await requireAuth('admin');
    if (!auth.ok) return auth.response;

    const { userId, newPassword } = await req.json();

    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD_LENGTH} অক্ষরের হতে হবে` },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createSupaClient(supabaseUrl, supabaseServiceKey);
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
