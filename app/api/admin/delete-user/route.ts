import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth('admin');
    if (!auth.ok) return auth.response;

    const { userId } = await request.json() as { userId?: unknown };
    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userId === auth.userId) {
      return NextResponse.json({ error: 'নিজের অ্যাকাউন্ট মুছে ফেলা যাবে না' }, { status: 400 });
    }

    const { error: deleteError } = await auth.supabase.rpc('admin_delete_user', {
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
