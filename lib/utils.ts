import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Bengali number conversion
export function toBengaliNumber(num: number | string): string {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[parseInt(d)]);
}

export function formatMoney(amount: number): string {
  return "৳" + amount.toLocaleString("bn-BD");
}

// Bengali month names
export const bengaliMonths = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

export const bengaliShortMonths = [
  "জান", "ফেব", "মার্চ", "এপ্রি", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে",
];

// Format date to Bengali
export function formatDateBengali(dateStr: string): string {
  const d = new Date(dateStr);
  const day = toBengaliNumber(d.getDate());
  const month = bengaliShortMonths[d.getMonth()];
  const year = toBengaliNumber(d.getFullYear());
  return `${day} ${month}, ${year}`;
}

// Convert number to Bengali words (for receipt "টাকার পরিমাণ কথায়")
const ones = ["", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়", "দশ", "এগারো", "বারো", "তেরো", "চোদ্দো", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ"];
const tens = ["", "দশ", "বিশ", "ত্রিশ", "চল্লিশ", "পঁচাশ", "ষাট", "সত্তর", "আশি", "নব্বই"];
const units = ["", "হাজার", "লাখ", "কোটি"];

function smallNumToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  return ones[Math.floor(n / 100)] + " শত" + (n % 100 ? " " + smallNumToWords(n % 100) : "");
}

export function numberToWordsBengali(num: number): string {
  if (!isFinite(num)) return "";
  const n = Math.round(Math.max(0, num));
  if (n === 0) return "শূন্য";
  const groups: number[] = [];
  let x = n;
  groups.push(x % 1000);
  x = Math.floor(x / 1000);
  while (x > 0) { groups.push(x % 100); x = Math.floor(x / 100); }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] > 0) parts.push(smallNumToWords(groups[i]) + (units[i] ? " " + units[i] : ""));
  }
  return parts.join(" ");
}

// Full Bengali month name from YYYY-MM key (used on receipts)
export function monthLabelBengali(ym: string): string {
  const m = parseInt(ym.split("-")[1], 10);
  const y = parseInt(ym.split("-")[0], 10);
  return `${bengaliMonths[m - 1]} ${toBengaliNumber(y)}`;
}

// Method labels in Bengali
export const methodLabels: Record<string, string> = {
  cash: "ক্যাশ",
  bkash: "বিকাশ",
  nagad: "নগদ (Nagad)",
  bank: "ব্যাংক",
};
