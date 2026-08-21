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

    const result = await sendDonationAlert(
      donation.members,
      donation.amount,
      donation.date
    );

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('WhatsApp Notify Error:', err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
