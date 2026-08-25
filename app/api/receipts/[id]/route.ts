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
    // Canvas setup (A4 ratio)
    const width = 1000;
    const height = 1414;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background (Warm Ivory)
    ctx.fillStyle = '#FAF9F5';
    ctx.fillRect(0, 0, width, height);

    // 2. Premium Border (Deep Green)
    ctx.strokeStyle = '#064E3B';
    ctx.lineWidth = 20;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    
    // Inner Gold Line
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // 3. Header Section (Deep Green)
    ctx.fillStyle = '#064E3B';
    ctx.beginPath();
    ctx.moveTo(30, 30);
    ctx.lineTo(width - 30, 30);
    ctx.lineTo(width - 30, 280);
    ctx.quadraticCurveTo(width/2, 320, 30, 280);
    ctx.closePath();
    ctx.fill();

    // 4. Logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        const logo = await loadImage(logoPath);
        // Gold Circle behind logo
        ctx.fillStyle = '#C9A227';
        ctx.beginPath();
        ctx.arc(120, 140, 75, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(120, 140, 70, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, 50, 70, 140, 140);
        ctx.restore();
      }
    } catch (e) {}

    // 5. Header Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = 'bold 42px Bengali';
    ctx.fillText("দৌলখাঁড় হিলফুল ফুযুল ফাউন্ডেশন", 220, 110);
    
    ctx.font = '18px Bengali';
    ctx.fillStyle = '#FAF9F5';
    ctx.fillText("প্রতিষ্ঠিত: ০১/০১/২০০৯ইং", 220, 150);
    
    // Location and Contact with simple icons (simulated with text)
    ctx.font = '16px Bengali';
    ctx.fillText("📍 দৌলখাঁড় পূর্বপাড়া, নাঙ্গলকোট, কুমিল্লা।", 220, 185);
    ctx.fillText("📞 ০১৮৪০-৮২৮০১০ | ০১৮১৪-৯৪৮২২১", 220, 215);

    // 6. Watermark
    try {
      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        const logo = await loadImage(logoPath);
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.drawImage(logo, (width - 600) / 2, (height - 600) / 2 + 100, 600, 600);
        ctx.restore();
      }
    } catch (e) {}

    // 7. Receipt Title Badge
    const badgeWidth = 450;
    const badgeHeight = 70;
    const badgeX = (width - badgeWidth) / 2;
    const badgeY = 360;

    ctx.fillStyle = '#064E3B';
    ctx.beginPath();
    ctx.moveTo(badgeX, badgeY);
    ctx.lineTo(badgeX + badgeWidth, badgeY);
    ctx.lineTo(badgeX + badgeWidth - 30, badgeY + badgeHeight);
    ctx.lineTo(badgeX + 30, badgeY + badgeHeight);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px Bengali';
    ctx.textAlign = 'center';
    ctx.fillText("অনুদান আদায়ের রশিদ", width / 2, badgeY + 45);

    // 8. Info Card
    const cardMargin = 80;
    const cardWidth = width - (cardMargin * 2);
    const cardY = 480;
    const rowHeight = 95;

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.05)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.roundRect(cardMargin, cardY, cardWidth, 620, 20);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    ctx.strokeStyle = '#D9DDD9';
    ctx.lineWidth = 1;
    ctx.strokeRect(cardMargin, cardY, cardWidth, 620);

    const rows = [
      { label: "রসিদ নং", value: donation.receipt_no || 'N/A' },
      { label: "তারিখ", value: donation.date },
      { label: "জনাব/জনাবা", value: donation.members?.name || 'Guest' },
      { label: "মাসের নাম", value: getBengaliMonthName(donation.donation_month) },
      { label: "টাকার পরিমাণ কথায়", value: numberToBengaliWords(donation.amount) + ' টাকা মাত্র' },
      { label: "টাকার পরিমাণ", value: `৳ ${donation.amount}/-` }
    ];

    rows.forEach((row, i) => {
      const y = cardY + 70 + (i * rowHeight);
      
      // Label
      ctx.textAlign = 'left';
      ctx.fillStyle = '#064E3B';
      ctx.font = 'bold 24px Bengali';
      ctx.fillText(row.label, cardMargin + 100, y);
      
      ctx.fillText(":", cardMargin + 350, y);

      // Value
      ctx.fillStyle = '#17201C';
      ctx.font = i === 5 ? 'bold 28px Bengali' : '24px Bengali';
      if (row.label.includes('কথায়')) ctx.font = 'italic 20px Bengali';
      
      ctx.fillText(String(row.value), cardMargin + 380, y);

      // Divider
      if (i < rows.length - 1) {
        ctx.strokeStyle = '#F0F0F0';
        ctx.beginPath();
        ctx.moveTo(cardMargin + 50, y + 35);
        ctx.lineTo(cardMargin + cardWidth - 50, y + 35);
        ctx.stroke();
      }
    });

    // 9. QR Code
    const qrSize = 150;
    const qrX = cardMargin + 50;
    const qrY = height - 320;
    
    const qrData = `https://daulkharfoundation.vercel.app/verify/${donation.receipt_no}`;
    const qrBuffer = await QRCode.toBuffer(qrData, {
      margin: 1,
      color: {
        dark: '#064E3B',
        light: '#FFFFFF'
      }
    });
    const qrImage = await loadImage(qrBuffer);
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    
    ctx.fillStyle = '#64706A';
    ctx.font = '14px Bengali';
    ctx.textAlign = 'center';
    ctx.fillText("রশিদ যাচাই করুন", qrX + qrSize/2, qrY + qrSize + 25);

    // 10. Signature
    const sigX = width - cardMargin - 250;
    const sigY = height - 220;
    
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sigX, sigY);
    ctx.lineTo(sigX + 200, sigY);
    ctx.stroke();
    
    ctx.fillStyle = '#17201C';
    ctx.font = 'italic 28px cursive'; // Signature style
    ctx.textAlign = 'center';
    ctx.fillText("Akash", sigX + 100, sigY - 20);

    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 18px Bengali';
    ctx.fillText("আদায়কারীর স্বাক্ষর", sigX + 100, sigY + 30);

    // 11. Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 22px Bengali';
    ctx.fillText("আপনার মহানুভবতার জন্য ধন্যবাদ!", width / 2, height - 120);
    
    ctx.fillStyle = '#64706A';
    ctx.font = 'italic 18px Bengali';
    ctx.fillText("আল্লাহ আপনার দান কবুল করুন", width / 2, height - 85);
    
    // Decorative Bottom Element
    ctx.fillStyle = '#C9A227';
    ctx.beginPath();
    ctx.moveTo(width/2 - 100, height - 60);
    ctx.lineTo(width/2 + 100, height - 60);
    ctx.lineTo(width/2, height - 50);
    ctx.closePath();
    ctx.fill();

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
