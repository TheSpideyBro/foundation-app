"use client";

import { useState, useRef } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { normalizePhone, makeReceiptFileName, getVerifyUrl } from "@/lib/utils";

type Props = {
  donationId: string;
  phone?: string | null;
  memberName?: string | null;
  receiptNo?: string | null;
  amount?: number;
  monthLabel?: string | null;
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
  monthLabel,
  className,
  title,
  ariaLabel,
  children,
}: Props) {
  const [busy, setBusy] = useState(false);
  const prefetched = useRef<{ blob: Blob; objectUrl: string; fileName: string } | null>(null);
  const prefetching = useRef(false);

  async function prefetch() {
    if (prefetched.current || prefetching.current) return;
    prefetching.current = true;
    try {
      const res = await fetch(
        `/api/receipt-image?donationId=${encodeURIComponent(donationId)}`,
        { credentials: "same-origin" }
      );
      if (!res.ok) throw new Error("রসিদের ছবি তৈরি করা যায়নি");
      const blob = await res.blob();
      const fileName = makeReceiptFileName(receiptNo || donationId);
      const objectUrl = URL.createObjectURL(blob);
      prefetched.current = { blob, objectUrl, fileName };
    } catch {
      // Prefetch failure is fine — click handler will retry with error UI.
      prefetching.current = false;
    }
  }

  function triggerDownload(href: string, fileName: string) {
    // iOS Safari ignores the `download` attribute — opening in a new tab lets
    // the user long-press the image to Share / Save to Photos / Files.
    if (isIOS()) {
      window.open(href, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(href), 60000);
      return;
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    // Firefox requires the anchor to be in the DOM.
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 5000);
  }

  function isIOS(): boolean {
    if (typeof navigator === "undefined") return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
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
      // Use pre-fetched file if ready; otherwise fetch now
      const data = prefetched.current ?? (await (async () => {
        const res = await fetch(
          `/api/receipt-image?donationId=${encodeURIComponent(donationId)}`,
          { credentials: "same-origin" }
        );
        if (!res.ok) throw new Error("রসিদের ছবি তৈরি করা যায়নি");
        const blob = await res.blob();
        const fileName = makeReceiptFileName(receiptNo || donationId);
        const objectUrl = URL.createObjectURL(blob);
        return { blob, objectUrl, fileName };
      })());

      // Trigger download (lands in gallery → recent images)
      triggerDownload(data.objectUrl, data.fileName);

      // Build WhatsApp message with verify URL
      const verifyUrl = getVerifyUrl(receiptNo ?? null);
      const lines = [
        `আসসালামু আলাইকুম ওয়ারাহমাতুল্লাহ 🤲`,
        ``,
        `*দৌলখাঁড় পূর্বপাড়া হিলফুল ফুজুল ফাউন্ডেশন*`,
        ``,
        `প্রিয় ${memberName || "সদস্য"},`,
        `আপনার জমার রসিদ প্রস্তুত হয়েছে ✅`,
        ``,
        receiptNo ? `🧾 রসিদ নং: ${receiptNo}` : null,
        monthLabel ? `📆 মাস: ${monthLabel}` : null,
        amount ? `💰 পরিমাণ: ৳${amount.toLocaleString("bn-BD")}` : null,
        verifyUrl ? `🔗 যাচাই: ${verifyUrl}` : null,
        ``,
        `জাযাকাল্লাহু খাইরান 🌙`,
      ].filter((l) => l !== null);
      const text = encodeURIComponent(lines.join("\n"));

      // Small delay so the download has time to land in gallery before chat opens
      await new Promise((r) => setTimeout(r, 300));
      window.open(`https://wa.me/${normalized}?text=${text}`, "_blank");
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
      onTouchStart={prefetch}
      onMouseEnter={prefetch}
      disabled={busy}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : children || <MessageCircle size={16} />}
    </button>
  );
}
