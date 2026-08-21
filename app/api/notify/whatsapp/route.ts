import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendDonationAlert } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const { donationId } = await req.json();
    const supabase = createClient();
    
    // Get donation details
    const { data: donation, error } = await supabase
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

    // Construct the public URL for the receipt image
    // Note: The receipt must be publicly accessible for WhatsApp to download it.
    // We'll use the existing receipt API route.
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    const receiptUrl = `${protocol}://${host}/api/receipts/${donation.id}`;

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
