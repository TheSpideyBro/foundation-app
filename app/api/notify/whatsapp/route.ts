import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { sendReceiptNotification } from '@/lib/receipt-notify';

/**
 * POST /api/notify/whatsapp { donationId }
 * Manually resends the member a WhatsApp receipt (F3). Staff-only.
 * Every attempt is logged to `notifications` via sendReceiptNotification.
 *
 * This route used to have NO authentication at all (middleware skips /api/*),
 * so anyone could trigger messages — and paid WhatsApp API calls — for any
 * donation id. It now requires a staff session.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth('staff');
    if (!auth.ok) return auth.response;

    const { donationId } = await req.json();
    if (typeof donationId !== 'string' || !donationId) {
      return NextResponse.json({ error: 'donationId is required' }, { status: 400 });
    }

    const result = await sendReceiptNotification({
      supabase: auth.supabase,
      donationId,
      sentBy: auth.userId,
    });

    return NextResponse.json({ success: result.status === 'sent', ...result });
  } catch (err) {
    console.error('WhatsApp Notify Error:', err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
