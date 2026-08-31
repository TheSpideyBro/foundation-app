import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json() as { userId?: unknown };
    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase configuration is missing' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Cookie writes can be unavailable after a read-only server operation.
          }
        },
      },
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

    const { error: deleteError } = await authClient.rpc('admin_delete_user', {
      target_user_id: userId,
    });
    if (deleteError) {
      const status = deleteError.message.includes('not found') ? 404 : 409;
      return NextResponse.json({ error: deleteError.message }, { status });
    }

    return NextResponse.json({ success: true, deletedUserId: userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
