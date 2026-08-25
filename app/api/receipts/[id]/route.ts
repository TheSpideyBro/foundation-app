import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCanvas, loadImage, registerFont } from 'canvas';
import QRCode from 'qrcode';
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
    30: 'ত্রিশ', 31: 'একত্রিশ', 32: 'বত্রিশ', 33: 'তেতাল্লিশ', 34: 'চৌত্রিশ', 35: 'পঁচিশ', 36: 'ছত্রিশ', 37: 'সাঁইত্রিশ', 38: 'আটত্রিশ', 39: 'ঊনচল্লিশ',
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

const getBengaliMonthName = (monthStr: string) => {
  if (!monthStr || !monthStr.includes('-')) return monthStr || 'N/A';
  const [year, month] = monthStr.split('-');
  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const monthIdx = parseInt(month) - 1;
  return `${months[monthIdx]} ${year}`;
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

  // Fetch donation details with collected_by info
  const { data: donation, error } = await supabase
    .from('donations')
    .select('*, members!member_id(name), collector:users!collected_by(name)')
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
    // Canvas setup (A4 ratio)
    const width = 1000;
    const height = 1500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background (Pure White)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 2. Header Section (Deep Green Gradient Style)
    ctx.fillStyle = '#064E3B';
    ctx.fillRect(0, 0, width, 320);
    
    // Bottom Curve for Header
    ctx.beginPath();
    ctx.moveTo(0, 320);
    ctx.bezierCurveTo(width/4, 380, 3*width/4, 260, width, 320);
    ctx.lineTo(width, 0);
    ctx.lineTo(0, 0);
    ctx.fill();

    // Gold Accent Line
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 325);
    ctx.bezierCurveTo(width/4, 385, 3*width/4, 265, width, 325);
    ctx.stroke();

    // 3. Logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        const logo = await loadImage(logoPath);
        ctx.save();
        ctx.beginPath();
        ctx.arc(140, 140, 90, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(logo, 50, 50, 180, 180);
        ctx.restore();
      }
    } catch (e) {}

    // 4. Header Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = 'bold 48px Bengali';
    ctx.fillText("দৌলখাঁড় হিলফুল ফুযুল ফাউন্ডেশন", 260, 110);
    
    ctx.font = '22px Bengali';
    ctx.fillText("প্রতিষ্ঠিত: ০১/০১/২০০৯ইং", 260, 160);
    
    ctx.font = '20px Bengali';
    ctx.fillText("📍 দৌলখাঁড় পূর্বপাড়া, নাঙ্গলকোট, কুমিল্লা।", 260, 205);
    ctx.fillText("📞 ০১৮৪০-৮২৮০১০ | ০১৮১৪-৯৪৮২২১", 260, 245);

    // 5. Receipt Title Badge
    const badgeWidth = 500;
    const badgeHeight = 80;
    const badgeX = (width - badgeWidth) / 2;
    const badgeY = 400;

    // Dark Badge Background
    ctx.fillStyle = '#17201C';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 40);
    ctx.fill();
    
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Bengali';
    ctx.textAlign = 'center';
    ctx.fillText("অনুদান আদায়ের রশিদ", width / 2, badgeY + 52);

    // 6. Main Content Card
    const cardMargin = 70;
    const cardWidth = width - (cardMargin * 2);
    const cardY = 530;
    const cardHeight = 820;
    const rowHeight = 100;

    ctx.fillStyle = '#FDFDFD';
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.roundRect(cardMargin, cardY, cardWidth, cardHeight, 25);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth = 2;
    ctx.stroke();

    const rows = [
      { label: "রসিদ নং", value: donation.receipt_no || 'N/A' },
      { label: "তারিখ", value: donation.date },
      { label: "জনাব/জনাবা", value: donation.members?.name || 'অজ্ঞাত' },
      { label: "মাসের নাম", value: getBengaliMonthName(donation.donation_month) },
      { label: "টাকার পরিমাণ কথায়", value: numberToBengaliWords(donation.amount) + ' টাকা মাত্র' },
      { label: "টাকার পরিমাণ", value: `৳ ${donation.amount}/-` },
      { label: "আদায়কারী", value: donation.collector?.name || 'অ্যাডমিন' }
    ];

    rows.forEach((row, i) => {
      const y = cardY + 80 + (i * rowHeight);
      
// Label
	      ctx.textAlign = 'left';
	      ctx.fillStyle = '#4B5563';
	      ctx.font = 'bold 24px Bengali';
	      ctx.fillText(row.label, cardMargin + 40, y);
	      
	      ctx.fillStyle = '#9CA3AF';
	      ctx.fillText(":", cardMargin + 380, y);

	      // Value
	      ctx.fillStyle = '#111827';
	      ctx.font = i === 5 ? 'bold 32px Bengali' : 'bold 26px Bengali';
	      if (row.label.includes('কথায়')) ctx.font = 'italic 22px Bengali';
	      
	      ctx.fillText(String(row.value), cardMargin + 410, y);

      // Divider
      if (i < rows.length - 1) {
        ctx.strokeStyle = '#F3F4F6';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cardMargin + 40, y + 45);
        ctx.lineTo(cardMargin + cardWidth - 40, y + 45);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // 7. QR Code Section
    const qrSize = 160;
    const qrX = cardMargin + 40;
    const qrY = height - 240;
    
    const qrData = `https://daulkharfoundation.vercel.app/verify/${donation.receipt_no}`;
    const qrBuffer = await QRCode.toBuffer(qrData, {
      margin: 1,
      width: qrSize,
      color: {
        dark: '#064E3B',
        light: '#FFFFFF'
      }
    });
    const qrImage = await loadImage(qrBuffer);
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    // 8. Signature Section
    const sigX = width - cardMargin - 280;
    const sigY = height - 120;
    
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sigX, sigY);
    ctx.lineTo(sigX + 240, sigY);
    ctx.stroke();
    
    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 22px Bengali';
    ctx.textAlign = 'center';
    ctx.fillText("আদায়কারীর স্বাক্ষর", sigX + 120, sigY + 40);

    // Signature text (Simulated)
    ctx.font = 'italic 32px cursive';
    ctx.fillStyle = '#111827';
    ctx.fillText(donation.collector?.name?.split(' ')[0] || "Admin", sigX + 120, sigY - 20);

    // 9. Footer Message
    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 26px Bengali';
    ctx.textAlign = 'center';
    ctx.fillText("আপনার মহানুভবতার জন্য ধন্যবাদ!", width / 2, height - 200);
    
    ctx.fillStyle = '#6B7280';
    ctx.font = '20px Bengali';
    ctx.fillText("আল্লাহ আপনার দান কবুল করুন", width / 2, height - 165);

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
