"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  donationId: string;
  mode: "share" | "download";
  className?: string;
  title?: string;
  ariaLabel?: string;
  children: ReactNode;
};

/**
 * Shares/downloads the premium receipt as a JPEG. The image is rendered
 * on the server (`GET /api/receipt-image`, headless Chromium) — client-side
 * DOM→image capture silently produced blank white images on iOS Safari.
 */
export default function ReceiptJpegButton({
  donationId,
  mode,
  className,
  title,
  ariaLabel,
  children,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/receipt-image?donationId=${encodeURIComponent(donationId)}`,
        { credentials: "same-origin" }
      );
      if (!res.ok) {
        let msg = "রসিদের ছবি তৈরি করা যায়নি";
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          /* keep default */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const receiptNo = res.headers.get("X-Receipt-No");
      const base = (receiptNo || donationId)
        .replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, "-")
        .slice(0, 40);
      const fileName = `roshid-${base || donationId.slice(0, 8)}.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      if (mode === "share") {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "রসিদ" });
        } else {
          // No file-share support (desktop browsers) — fall back to download.
          triggerDownload(URL.createObjectURL(file), fileName);
        }
      } else {
        triggerDownload(URL.createObjectURL(file), fileName);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        window.alert(
          err instanceof Error ? err.message : "রসিদ শেয়ার করা যায়নি"
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy}
      className={className}
      title={title}
      aria-label={ariaLabel || title}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  );
}

function triggerDownload(href: string, fileName: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 5000);
}
