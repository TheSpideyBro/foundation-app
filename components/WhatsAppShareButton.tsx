"use client";

import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";

type Props = {
  donationId: string;
  phone?: string | null;
  memberName?: string | null;
  receiptNo?: string | null;
  amount?: number;
  className?: string;
  title?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
};

/**
 * WhatsApp direct share: downloads the receipt JPEG (so it's in the
 * gallery's recent images) then opens wa.me to the member's chat with a
 * pre-filled message. The user taps attach → recent → sends.
 *
 * Note: browsers cannot programmatically attach an image to a WhatsApp
 * chat — this is the closest achievable UX (wa.me only supports text).
 */
export default function WhatsAppShareButton({
  donationId,
  phone,
  memberName,
  receiptNo,
  amount,
  className,
  title,
  ariaLabel,
  children,
}: Props) {
  const [busy, setBusy] = useState(false);

  /** Normalize BD phone: 01XXXXXXXXX → 8801XXXXXXXXX */
  function normalizePhone(p: string): string | null {
    const digits = p.replace(/\D/g, "");
    if (digits.startsWith("880") && digits.length === 13) return digits;
    if (digits.startsWith("01") && digits.length === 11) return "880" + digits.slice(1);
    if (digits.length === 10 && digits.startsWith("1")) return "880" + digits;
    return null;
  }

  async function handleClick() {
    if (busy) return;

    const normalized = phone ? normalizePhone(phone) : null;
    if (!normalized) {
      window.alert("সদস্যের WhatsApp নম্বর পাওয়া যায়নি");
      return;
    }

    setBusy(true);
    try {
      // 1. Fetch receipt JPEG
      const res = await fetch(
        `/api/receipt-image?donationId=${encodeURIComponent(donationId)}`,
        { credentials: "same-origin" }
      );
      if (!res.ok) throw new Error("রসিদের ছবি তৈরি করা যায়নি");
      const blob = await res.blob();

      // 2. Trigger download (lands in gallery → recent images)
      const receiptLabel = (receiptNo || donationId).replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, "-").slice(0, 40);
      const fileName = `roshid-${receiptLabel}.jpg`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 3. Open WhatsApp to the member's chat with pre-filled text
      const lines = [
        `আসসালামু আলাইকুম${memberName ? ` ${memberName}` : ""},`,
        ``,
        `আপনার জমার রসিদ প্রস্তুত।`,
        receiptNo ? `রসিদ নং: ${receiptNo}` : null,
        amount ? `পরিমাণ: ৳${amount.toLocaleString("bn-BD")}` : null,
        ``,
        `ছবিটি গ্যালারি থেকে attach করে পাঠাচ্ছি।`,
      ].filter((l) => l !== null);
      const text = encodeURIComponent(lines.join("\n"));
      window.open(`https://wa.me/${normalized}?text=${text}`, "_blank");

      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "WhatsApp শেয়ার করা যায়নি");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : children || <MessageCircle size={16} />}
    </button>
  );
}
