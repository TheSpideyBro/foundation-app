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
const fontPathSignature = path.join(process.cwd(), 'public', 'fonts', 'MainakBuniyadi-Italic.ttf');
if (fs.existsSync(fontPathSignature)) {
  registerFont(fontPathSignature, { family: 'SignatureFont' });
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

  let { data: donation, error } = await supabase
    .from('donations')
    .select('*, members!member_id(name), collector:users!collected_by(name, members(name))')
    .eq('id', id)
    .single();

  if (error || !donation) {
    return new NextResponse('Donation not found', { status: 404 });
  }

  // Check if it's part of a batch
  let displayMonth = getBengaliMonthName(donation.donation_month);
  let displayAmount = donation.amount;
  let displayReceiptNo = donation.receipt_no;

  if (donation.batch_id) {
    const { data: batchDonations } = await supabase
      .from('donations')
      .select('amount, donation_month, receipt_no')
      .eq('batch_id', donation.batch_id)
      .order('donation_month', { ascending: true });

    if (batchDonations && batchDonations.length > 1) {
      const startMonth = getBengaliMonthName(batchDonations[0].donation_month);
      const endMonth = getBengaliMonthName(batchDonations[batchDonations.length - 1].donation_month);
      displayMonth = `${startMonth} - ${endMonth} (${batchDonations.length.toString().padStart(2, '০')} মাস)`;
      displayAmount = batchDonations.reduce((sum: number, d: any) => sum + d.amount, 0);
      displayReceiptNo = `${donation.receipt_no.split('-')[0]} (Batch)`;
    }
  }

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
    const width = 1000;
    const height = 1500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 2. Header Section
    const grad = ctx.createLinearGradient(0, 0, 0, 350);
    grad.addColorStop(0, '#022C22'); // Deep Royal Green
    grad.addColorStop(1, '#064E3B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 320);
    
    // Bottom Wave
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
        ctx.arc(100, 155, 75, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(logo, 25, 80, 150, 150);
        ctx.restore();
      }
    } catch (e) {}

    // 4. Header Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Adjust text to the right of the logo (logo ends around x=180)
    const textLeftX = 250;

    ctx.textAlign = 'left';
    ctx.font = 'bold 42px Bengali';
    ctx.fillText("দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন", textLeftX, 110);
    
    ctx.shadowBlur = 4;
    ctx.font = 'bold 28px Bengali';
    ctx.fillText("প্রতিষ্ঠিত: ০১/০১/২০০৯ইং", textLeftX, 175);
    
    ctx.font = '24px Bengali';
    ctx.fillText("📍 দৌলখাঁড় পূর্বপাড়া, নাঙ্গলকোট, কুমিল্লা।", textLeftX, 230);
    ctx.fillText("📞 ০১৮৪০-৮২৮০১০ | ০১৮১৪-৯৪৮২২৪", textLeftX, 275);
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 5. Receipt Title Badge
    const badgeWidth = 500;
    const badgeHeight = 80;
    const badgeX = (width - badgeWidth) / 2;
    const badgeY = 400;

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
    const cardHeight = 720;
    const rowHeight = 100;

    ctx.fillStyle = '#FFFEF7'; // Ivory/Cream Background
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.roundRect(cardMargin, cardY, cardWidth, cardHeight, 25);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Golden Double Border
    ctx.strokeStyle = '#D4AF37'; // Metallic Gold
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#F3E5AB'; // Light Gold
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardMargin + 5, cardY + 5, cardWidth - 10, cardHeight - 10, 20);
    ctx.stroke();

    // 6.5 Watermark
    try {
      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        const logo = await loadImage(logoPath);
        ctx.save();
        ctx.globalAlpha = 0.08;
        const watermarkSize = 400;
        ctx.drawImage(logo, (width - watermarkSize) / 2, cardY + (cardHeight - watermarkSize) / 2, watermarkSize, watermarkSize);
        ctx.restore();
      }
    } catch (e) {}

    // 7. Content Rows
    const amountInWords = numberToBengaliWords(displayAmount || 0);
    const rows = [
      { label: "রসিদ নং", value: displayReceiptNo || 'N/A', icon: 'doc' },
      { label: "তারিখ", value: donation.date, icon: 'cal' },
      { label: "জনাব/জনাবা", value: donation.members?.name || 'অজ্ঞাত', icon: 'user' },
      { label: "মাসের নাম", value: displayMonth, icon: 'month' },
      { label: "টাকার পরিমাণ কথায়", value: `${amountInWords} টাকা`, icon: 'text' },
      { label: "টাকার পরিমাণ", value: `৳ ${displayAmount}/-`, icon: 'cash' },
      { label: "আদায়কারী", value: donation.collector?.members?.name || donation.collector?.name || "অ্যাডমিন", icon: 'pen' }
    ];

    rows.forEach((row, i) => {
      const y = cardY + 80 + (i * rowHeight);
      
      // Draw Custom Icons
      ctx.strokeStyle = '#064E3B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const iconX = cardMargin + 40;
      const iconY = y - 35;
      
      // Icon Box
      ctx.fillStyle = '#F3F4F6';
      ctx.beginPath();
      ctx.roundRect(iconX, iconY, 60, 60, 15);
      ctx.fill();

      // Icon drawing based on type
      ctx.strokeStyle = '#064E3B';
      ctx.lineWidth = 2.5;
      const cx = iconX + 30;
      const cy = iconY + 30;
      
      if (row.icon === 'doc') {
        ctx.strokeRect(cx-12, cy-15, 24, 30);
        ctx.beginPath(); ctx.moveTo(cx-6, cy-5); ctx.lineTo(cx+6, cy-5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-6, cy+5); ctx.lineTo(cx+6, cy+5); ctx.stroke();
      } else if (row.icon === 'cal') {
        ctx.strokeRect(cx-15, cy-12, 30, 24);
        ctx.beginPath(); ctx.moveTo(cx-15, cy-4); ctx.lineTo(cx+15, cy-4); ctx.stroke();
      } else if (row.icon === 'user') {
        ctx.beginPath(); ctx.arc(cx, cy-8, 8, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy+15, 12, Math.PI, 0); ctx.stroke();
      } else if (row.icon === 'month') {
        ctx.strokeRect(cx-15, cy-15, 30, 30);
        ctx.beginPath(); ctx.moveTo(cx-15, cy); ctx.lineTo(cx+15, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy-15); ctx.lineTo(cx, cy+15); ctx.stroke();
      } else if (row.icon === 'text') {
        ctx.beginPath(); ctx.moveTo(cx-15, cy-10); ctx.lineTo(cx+15, cy-10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-15, cy); ctx.lineTo(cx+5, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-15, cy+10); ctx.lineTo(cx+10, cy+10); ctx.stroke();
      } else if (row.icon === 'money') {
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.stroke();
        ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#064E3B'; ctx.fillText('৳', cx, cy+6);
      } else if (row.icon === 'edit') {
        ctx.beginPath(); ctx.moveTo(cx-12, cy+12); ctx.lineTo(cx+12, cy-12); ctx.stroke();
        ctx.strokeRect(cx-15, cy+10, 5, 5);
      }

      // Label
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4B5563';
      ctx.font = 'bold 24px Bengali';
      ctx.fillText(row.label, cardMargin + 130, y);
      
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
    const qrSize = 120;
    const qrX = cardMargin + 40;
    const qrY = height - 240;
    
    const qrData = `https://daulkharfoundation.vercel.app/verify/${donation.receipt_no}`;
    const qrBuffer = await QRCode.toBuffer(qrData, {
      margin: 1,
      width: qrSize,
      color: { dark: '#064E3B', light: '#FFFFFF' }
    });
    const qrImage = await loadImage(qrBuffer);
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    
    // Gold seal removed as requested

    // 8. Signature Section
    const sigX = width - cardMargin - 280;
    const sigY = height - 180;
    
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

    // Signature text (Black Ink Look with new font)
    ctx.font = '44px SignatureFont';
    ctx.fillStyle = '#000000';
    ctx.fillText(donation.collector?.members?.name || donation.collector?.name || "অ্যাডমিন", sigX + 120, sigY - 20);

    // 9. Footer Message
    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 28px Bengali';
    ctx.textAlign = 'center';
    
    // Heart Icon and Thank You
    const footerY = height - 80;
    ctx.beginPath();
    ctx.arc(width/2 - 220, footerY - 10, 15, 0, Math.PI*2);
    ctx.fill();
    ctx.fillText("আপনার মহানুভবতার জন্য ধন্যবাদ!", width / 2 + 20, footerY);
    
    ctx.fillStyle = '#6B7280';
    ctx.font = '22px Bengali';
    ctx.fillText("আল্লাহ আপনার দান কবুল করুন", width / 2, footerY + 40);

    // Gold Stars
    ctx.fillStyle = '#C9A227';
    const drawStar = (x: number, y: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y-10); ctx.lineTo(x+3, y-3); ctx.lineTo(x+10, y);
      ctx.lineTo(x+3, y+3); ctx.lineTo(x, y+10); ctx.lineTo(x-3, y+3);
      ctx.lineTo(x-10, y); ctx.lineTo(x-3, y-3); ctx.closePath();
      ctx.fill();
    };
    drawStar(width/2 - 150, footerY + 40);
    drawStar(width/2 + 150, footerY + 40);

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
