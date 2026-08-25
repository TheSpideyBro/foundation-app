import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing userId or newPassword' }, { status: 400 });
    }

    // Check if the current user is an admin
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

    // Check role from public.users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // Use service role client to update password
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
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
