import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getAccessToken(rawToken: string): string {
  if (!rawToken.startsWith('base64-')) return rawToken;

  try {
    const json = Buffer.from(rawToken.slice(7), 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as { access_token?: unknown };
    return typeof parsed.access_token === 'string' ? parsed.access_token : '';
  } catch {
    return '';
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json() as { userId?: unknown };
    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key is not configured' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.getAll().find((cookie) => /^sb-.*-auth-token$/.test(cookie.name));
    const accessToken = getAccessToken(tokenCookie?.value || '');
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user: currentUser } } = await authClient.auth.getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUserData } = await authClient
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    const isAdmin = currentUserData?.role === 'admin' || currentUser.email === 'saddamakash234@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'নিজের অ্যাকাউন্ট মুছে ফেলা যাবে না' }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: targetUser, error: targetError } = await adminClient.auth.admin.getUserById(userId);
    if (targetError || !targetUser.user) {
      return NextResponse.json({ error: 'ইউজার পাওয়া যায়নি' }, { status: 404 });
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 409 });
    }

    return NextResponse.json({ success: true, deletedUserId: userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
