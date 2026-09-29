import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { sendDonationAlert } from '@/lib/whatsapp';

/**
 * POST /api/notify/whatsapp { donationId }
 * Sends the member a WhatsApp donation alert with a receipt link.
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

    // Get donation details (cookie-scoped client — RLS applies)
    const { data: donation, error } = await auth.supabase
      .from('donations')
      .select('*, members(*)')
      .eq('id', donationId)
      .single();

    if (error || !donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    if (!donation.members?.phone) {
      return NextResponse.json({ error: 'Member has no phone number' }, { status: 400 });
    }

    // Receipt link. Prefer the configured site URL: building it from the
    // request Host/x-forwarded-proto headers lets a caller point the member
    // at an arbitrary origin.
    const host = req.headers.get('host');
    const fallback = host ? `${req.headers.get('x-forwarded-proto') || 'http'}://${host}` : null;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || fallback;
    if (!baseUrl) {
      return NextResponse.json({ error: 'Site URL is not configured' }, { status: 500 });
    }
    const receiptUrl = `${baseUrl}/api/receipts/${donation.id}`;

    const result = await sendDonationAlert(
      donation.members,
      donation.amount,
      donation.date,
      receiptUrl
    );

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('WhatsApp Notify Error:', err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
