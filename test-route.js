const { createCanvas, loadImage, registerFont } = require('canvas');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Mock data
const donation = {
  receipt_no: 'R-255712',
  amount: 500,
  date: '2026-08-25',
  donation_month: '2026-08',
  members: { name: 'সাদ্দাম হোসেন আকাশ' },
  collector: { 
    name: 'Mijanur Rahman',
    members: { name: 'মিজানুর রহমান' }
  }
};

// Functions from route.ts
const numberToBengaliWords = (n) => {
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
  if (n in special) return special[n];
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
    if (n in special) result += special[n];
    else {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      if (ten > 0) result += tens[ten] + ' ';
      if (unit > 0) result += units[unit];
    }
  }
  return result.trim();
};

const getBengaliMonthName = (monthStr) => {
  if (!monthStr || !monthStr.includes('-')) return monthStr || 'N/A';
  const [year, month] = monthStr.split('-');
  const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const monthIdx = parseInt(month) - 1;
  return `${months[monthIdx]} ${year}`;
};

// Register fonts
const fontPathBold = path.join(__dirname, 'public/fonts/HindSiliguri-Bold.ttf');
const fontPathRegular = path.join(__dirname, 'public/fonts/HindSiliguri-Regular.ttf');
const fontPathSignature = path.join(__dirname, 'public/fonts/MainakBuniyadi-Italic.ttf');

if (fs.existsSync(fontPathBold)) registerFont(fontPathBold, { family: 'Bengali', weight: 'bold' });
if (fs.existsSync(fontPathRegular)) registerFont(fontPathRegular, { family: 'Bengali', weight: 'normal' });
if (fs.existsSync(fontPathSignature)) registerFont(fontPathSignature, { family: 'SignatureFont' });

async function run() {
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
    grad.addColorStop(0, '#022C22');
    grad.addColorStop(1, '#064E3B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 320);
    
    ctx.beginPath();
    ctx.moveTo(0, 320);
    ctx.bezierCurveTo(width/4, 380, 3*width/4, 260, width, 320);
    ctx.lineTo(width, 0);
    ctx.lineTo(0, 0);
    ctx.fill();

    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 325);
    ctx.bezierCurveTo(width/4, 385, 3*width/4, 265, width, 325);
    ctx.stroke();

    // 3. Logo
    const logoPath = path.join(__dirname, 'public/assets/logo.jpg');
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

    // 4. Header Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = 'bold 42px Bengali';
    ctx.fillText("দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন", 250, 110);
    
    ctx.font = 'bold 28px Bengali';
    ctx.fillText("প্রতিষ্ঠিত: ০১/০১/২০০৯ইং", 250, 175);
    
    ctx.font = '24px Bengali';
    ctx.fillText("📍 দৌলখাঁড় পূর্বপাড়া, নাঙ্গলকোট, কুমিল্লা।", 250, 230);
    ctx.fillText("📞 ০১৮৪০-৮২৮০১০ | ০১৮১৪-৯৪৮২২৪", 250, 275);

    // 5. Badge
    const badgeX = (width - 500) / 2;
    const badgeY = 400;
    ctx.fillStyle = '#17201C';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, 500, 80, 40);
    ctx.fill();
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Bengali';
    ctx.textAlign = 'center';
    ctx.fillText("অনুদান আদায়ের রশিদ", width / 2, badgeY + 52);

    // 6. Content Card
    const cardMargin = 70;
    const cardWidth = width - (cardMargin * 2);
    const cardY = 530;
    const cardHeight = 720;
    ctx.fillStyle = '#FFFEF7';
    ctx.beginPath();
    ctx.roundRect(cardMargin, cardY, cardWidth, cardHeight, 25);
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 7. Rows
    const amountInWords = numberToBengaliWords(donation.amount);
    const rows = [
      { label: "রসিদ নং", value: donation.receipt_no, icon: 'doc' },
      { label: "তারিখ", value: donation.date, icon: 'cal' },
      { label: "জনাব/জনাবা", value: donation.members.name, icon: 'user' },
      { label: "মাসের নাম", value: getBengaliMonthName(donation.donation_month), icon: 'month' },
      { label: "টাকার পরিমাণ কথায়", value: `${amountInWords} টাকা`, icon: 'text' },
      { label: "টাকার পরিমাণ", value: `৳ ${donation.amount}/-`, icon: 'cash' },
      { label: "আদায়কারী", value: donation.collector.members?.name || donation.collector.name, icon: 'pen' }
    ];

    rows.forEach((row, i) => {
      const y = cardY + 80 + (i * 100);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4B5563';
      ctx.font = 'bold 24px Bengali';
      ctx.fillText(row.label, cardMargin + 130, y);
      ctx.fillStyle = '#111827';
      ctx.font = i === 5 ? 'bold 32px Bengali' : 'bold 26px Bengali';
      ctx.fillText(String(row.value), cardMargin + 410, y);
    });

    // 8. QR
    const qrData = `https://daulkharfoundation.vercel.app/verify/${donation.receipt_no}`;
    const qrBuffer = await QRCode.toBuffer(qrData, { margin: 1, width: 120 });
    const qrImage = await loadImage(qrBuffer);
    ctx.drawImage(qrImage, cardMargin + 40, height - 240, 120, 120);

    // 9. Signature
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

    ctx.font = '44px SignatureFont';
    ctx.fillStyle = '#000000';
    ctx.fillText(donation.collector.members?.name || donation.collector.name, sigX + 120, sigY - 20);

    const buffer = canvas.toBuffer('image/jpeg');
    fs.writeFileSync('test-receipt-final.jpg', buffer);
    console.log('Success: test-receipt-final.jpg generated');
  } catch (err) {
    console.error('Test Failed:', err);
  }
}
run();
