import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Fetch donation details
  const { data: donation, error } = await supabase
    .from('donations')
    .select('*, members(name)')
    .eq('id', id)
    .single();

  if (error || !donation) {
    return new NextResponse('Donation not found', { status: 404 });
  }

  // Security check: Admins can see all, members only their own
  const { data: userData } = await supabase
    .from('users')
    .select('role, member_id')
    .eq('id', user.id)
    .single();

  const isAdmin = userData?.role === 'admin' || userData?.role === 'treasurer' || user?.email === 'saddamakash234@gmail.com';
  const isOwner = userData?.member_id === donation.member_id;
  
  if (!isAdmin && !isOwner) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    // Canvas setup (A5 ratio)
    const width = 800;
    const height = 1131;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#FDFCF9';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#0F3D33';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Header
    ctx.fillStyle = '#0F3D33';
    ctx.fillRect(20, 20, width - 40, 160);

    // Logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        const logo = await loadImage(logoPath);
        ctx.save();
        ctx.beginPath();
        ctx.arc(95, 100, 55, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, 40, 45, 110, 110);
        ctx.restore();
      }
    } catch (e) {
      console.error('Logo error:', e);
    }

    // Title & Branding
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px sans-serif';
    const title = "Doulkhand East Hilful Fuzul Foundation";
    ctx.fillText(title.substring(0, 25) + (title.length > 25 ? '...' : ''), 170, 85);
    
    ctx.font = '20px sans-serif';
    ctx.fillText("Charity & Community Development", 170, 125);

    // Receipt Label
    ctx.fillStyle = '#1C1B17';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("DONATION RECEIPT", width / 2, 250);

    // Content
    ctx.textAlign = 'left';
    let y = 380;
    const lineHeight = 70;
    
    const details = [
      ["Receipt No:", donation.receipt_no || 'N/A'],
      ["Date:", donation.date],
      ["Member Name:", donation.members?.name || 'Guest'],
      ["Amount:", `BDT ${donation.amount}/-`],
      ["Method:", donation.method || 'cash'],
      ["Received By:", donation.received_by || 'Foundation']
    ];

    details.forEach(([label, value]) => {
      ctx.fillStyle = '#0F3D33';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(label, 100, y);
      
      ctx.fillStyle = '#1C1B17';
      ctx.font = '22px sans-serif';
      ctx.fillText(String(value), 350, y);
      
      ctx.strokeStyle = '#E6E1D4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, y + 20);
      ctx.lineTo(width - 100, y + 20);
      ctx.stroke();
      
      y += lineHeight;
    });

    // Signatures
    ctx.strokeStyle = '#1C1B17';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(100, height - 200);
    ctx.lineTo(300, height - 200);
    ctx.stroke();
    ctx.font = '18px sans-serif';
    ctx.fillText("Authorized Sign", 120, height - 170);
    
    ctx.beginPath();
    ctx.moveTo(width - 300, height - 200);
    ctx.lineTo(width - 100, height - 200);
    ctx.stroke();
    ctx.fillText("Member Sign", width - 260, height - 170);

    // Footer
    ctx.textAlign = 'center';
    ctx.font = 'italic 20px sans-serif';
    ctx.fillText("Thank you for your generous contribution!", width / 2, height - 80);

    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="receipt_${donation.receipt_no || id}.jpg"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Receipt Generation Error:', err);
    return new NextResponse(`Error generating receipt: ${err.message}`, { status: 500 });
  }
}
