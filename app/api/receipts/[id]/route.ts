import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';

// Register Bengali font
const fontPathBold = path.join(process.cwd(), 'public', 'fonts', 'HindSiliguri-Bold.ttf');
const fontPathRegular = path.join(process.cwd(), 'public', 'fonts', 'HindSiliguri-Regular.ttf');
if (fs.existsSync(fontPathBold)) {
  registerFont(fontPathBold, { family: 'Bengali', weight: 'bold' });
}
if (fs.existsSync(fontPathRegular)) {
  registerFont(fontPathRegular, { family: 'Bengali', weight: 'normal' });
}

const numberToBengaliWords = (n: number): string => {
  const units = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'];
  const tens = ['', 'দশ', 'বিশ', 'ত্রিশ', 'চল্লিশ', 'পঞ্চাশ', 'ষাট', 'সত্তর', 'আশি', 'নব্বই'];
  const special = {
    10: 'দশ', 11: 'এগারো', 12: 'বারো', 13: 'তেরো', 14: 'চৌদ্দ', 15: 'পনেরো', 16: 'ষোলো', 17: 'সতেরো', 18: 'আঠারো', 19: 'উনিশ',
    20: 'বিশ', 21: 'একুশ', 22: 'বাইশ', 23: 'তেইশ', 24: 'চব্বিশ', 25: 'পঁচিশ', 26: 'ছাব্বিশ', 27: 'সাতাশ', 28: 'আটাশ', 29: 'উনত্রিশ',
    30: 'ত্রিশ', 31: 'একত্রিশ', 32: 'বত্রিশ', 33: 'তেত্রিশ', 34: 'চৌত্রিশ', 35: 'পঁচিশ', 36: 'ছত্রিশ', 37: 'সাঁইত্রিশ', 38: 'আটত্রিশ', 39: 'ঊনচল্লিশ',
    40: 'চল্লিশ', 41: 'একচল্লিশ', 42: 'বিয়াল্লিশ', 43: 'তেতাল্লিশ', 44: 'চুয়াল্লিশ', 45: 'পঁয়তাল্লিশ', 46: 'ছেচল্লিশ', 47: 'সাতচল্লিশ', 48: 'আটচল্লিশ', 49: 'ঊনপঞ্চাশ',
    50: 'পঞ্চাশ', 100: 'একশত', 200: 'দুইশত', 300: 'তিনশত', 400: 'চারশত', 500: 'পাঁচশত', 600: 'ছয়শত', 700: 'সাতশত', 800: 'আটশত', 900: 'নয়শত'
  };

  if (n === 0) return 'শূন্য';
  if (n in special) return (special as any)[n];

  let result = '';
  if (n >= 1000) {
    const thousand = Math.floor(n / 1000);
    result += (thousand === 1 ? 'এক' : numberToBengaliWords(thousand)) + ' হাজার ';
    n %= 1000;
  }
  if (n >= 100) {
    const hundred = Math.floor(n / 100);
    result += (hundred === 1 ? 'এক' : units[hundred]) + ' শত ';
    n %= 100;
  }
  if (n > 0) {
    if (n in special) result += (special as any)[n];
    else {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      if (ten > 0) result += tens[ten] + ' ';
      if (unit > 0) result += units[unit];
    }
  }
  return result.trim();
};

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

    // Background with subtle texture
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Decorative Gold Border
    ctx.strokeStyle = '#B8860B'; // Dark Gold
    ctx.lineWidth = 15;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    
    ctx.strokeStyle = '#0F3D33'; // Deep Green
    ctx.lineWidth = 2;
    ctx.strokeRect(25, 25, width - 50, height - 50);

    // Header Area
    ctx.fillStyle = '#0F3D33';
    ctx.fillRect(25, 25, width - 50, 180);
    
    // Header Accent Line
    ctx.fillStyle = '#B8860B';
    ctx.fillRect(25, 205, width - 50, 5);

    // Logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        const logo = await loadImage(logoPath);
        // Gold Circle behind logo
        ctx.fillStyle = '#B8860B';
        ctx.beginPath();
        ctx.arc(105, 115, 65, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(105, 115, 60, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, 45, 55, 120, 120);
        ctx.restore();
      }
    } catch (e) {}

    // Title & Branding
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = 'bold 38px Bengali';
    ctx.fillText("দৌলখাঁড় হিলফুল ফুযুল ফাউন্ডেশন", 190, 85);
    
    ctx.font = '16px Bengali';
    ctx.fillStyle = '#E6E1D4';
    ctx.fillText("প্রতিষ্ঠিত: ০১/০১/২০০৯ইং, দৌলখাঁড় পূর্বপাড়া, নাঙ্গলকোট, কুমিল্লা।", 190, 120);
    ctx.fillText("যোগাযোগ: (বিকাশ-নগদ) ০১৮৪০-৮২৮০১০, (বিকাশ-নগদ) ০১৮১৪-৯৪৮২২১", 190, 145);
    ctx.font = 'bold 16px Bengali';
    ctx.fillText("", 190, 175);

    // Watermark Logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        const logo = await loadImage(logoPath);
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.drawImage(logo, (width - 500) / 2, (height - 500) / 2 + 100, 500, 500);
        ctx.restore();
      }
    } catch (e) {}

    // Receipt Label (Premium Ribbon)
    ctx.fillStyle = '#0F3D33';
    ctx.beginPath();
    ctx.moveTo(width/2 - 200, 240);
    ctx.lineTo(width/2 + 200, 240);
    ctx.lineTo(width/2 + 180, 285);
    ctx.lineTo(width/2 - 180, 285);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px Bengali';
    ctx.textAlign = 'center';
    ctx.fillText("অনুদান আদায়ের রসিদ", width / 2, 272);

    // Content Area
    ctx.textAlign = 'left';
    let y = 380;
    const lineHeight = 85;
    
    const details = [
      ["রসিদ নং:", donation.receipt_no || 'N/A'],
      ["তারিখ:", donation.date],
      ["জনাব/জনাবা:", donation.members?.name || 'Guest'],
      ["মাসের নাম:", donation.donation_month || 'N/A'],
      ["টাকার পরিমাণ কথায়:", numberToBengaliWords(donation.amount) + ' টাকা মাত্র'],
      ["টাকার পরিমাণ:", `৳ ${donation.amount}/-`]
    ];

    details.forEach(([label, value]) => {
      ctx.fillStyle = '#0F3D33';
      ctx.font = 'bold 24px Bengali';
      ctx.fillText(label, 100, y);
      
      ctx.fillStyle = '#1C1B17';
      ctx.font = '24px Bengali';
      // If label is amount in words, it might be long
      if (label.includes('কথায়')) {
        ctx.font = 'italic 20px Bengali';
      }
      ctx.fillText(String(value), 350, y);
      
      ctx.strokeStyle = '#E6E1D4';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(100, y + 20);
      ctx.lineTo(width - 100, y + 20);
      ctx.stroke();
      ctx.setLineDash([]);
      
      y += lineHeight;
    });

    // Signatures
    ctx.strokeStyle = '#1C1B17';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(width - 300, height - 200);
    ctx.lineTo(width - 100, height - 200);
    ctx.stroke();
    ctx.font = '18px Bengali';
    ctx.textAlign = 'right';
    ctx.fillText("আদায়কারীর স্বাক্ষর", width - 100, height - 170);

    // Footer
    ctx.textAlign = 'center';
    ctx.font = 'italic 20px Bengali';
    ctx.fillText("আপনার মহানুভবতার জন্য ধন্যবাদ!", width / 2, height - 80);

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
