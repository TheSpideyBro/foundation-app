"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { normalizePhone, getVerifyUrl } from "@/lib/utils";
import {
  fetchReceiptImage,
  scheduleReceiptPrefetch,
  triggerDownload,
} from "@/lib/receipt-image";

type Props = {
  donationId: string;
  phone?: string | null;
  memberName?: string | null;
  receiptNo?: string | null;
  amount?: number | null;
  monthLabel?: string | null;
  className?: string;
  title?: string;
  ariaLabel?: string;
  children?: ReactNode;
};

/**
 * WhatsApp direct share: downloads the receipt JPEG (so it's in the
 * gallery's recent images) then opens wa.me to the member's chat with a
 * pre-filled Bengali message — the user taps attach → recent images →
 * sends. Browsers cannot attach files programmatically or pre-select a
 * contact with a file (wa.me supports text only), so this is the closest
 * achievable UX.
 *
 * Speed (BUG-048): the image comes from the shared lib/receipt-image cache
 * (one render per donation, shared with the receipt share button) with an
 * IntersectionObserver prefetch on the card, so the click path rarely waits
 * for a render at all.
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
  const prefetchStarted = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Early prefetch: warm the server render while the user is reading the
  // card instead of only at touchstart (no head start there).
  useEffect(() => {
    const el = buttonRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !prefetchStarted.current) {
          prefetchStarted.current = true;
          scheduleReceiptPrefetch(donationId);
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [donationId]);

  async function handleClick() {
    if (busy) return;

    const normalized = phone ? normalizePhone(phone) : null;
    if (!normalized) {
      window.alert("সদস্যের WhatsApp নম্বর পাওয়া যায়নি");
      return;
    }

    setBusy(true);
    try {
      const entry = await fetchReceiptImage(donationId);
      const objectUrl = URL.createObjectURL(entry.blob);

      // Trigger download (lands in gallery → recent images)
      triggerDownload(objectUrl, entry.fileName);

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
      const waUrl = `https://wa.me/${normalized}?text=${text}`;
      // Popup blockers can reject window.open after async work — fall back to
      // same-tab navigation so the member's chat still opens.
      if (window.open(waUrl, "_blank") === null) {
        window.location.href = waUrl;
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "WhatsApp শেয়ার করা যায়নি");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => void handleClick()}
      onTouchStart={() => void fetchReceiptImage(donationId).catch(() => undefined)}
      onMouseEnter={() => void fetchReceiptImage(donationId).catch(() => undefined)}
      disabled={busy}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : children || <MessageCircle size={16} />}
    </button>
  );
}
