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
 *
 * Cross-platform strategy (iOS / Android / Mac / Windows, all browsers):
 * 1. Share mode: try navigator.share({files}) — ANY failure except user-cancel
 *    falls back to download. We don't trust navigator.canShare alone.
 * 2. Download mode: anchor download; on iOS Safari (where `download`
 *    attribute is ignored) open in a new tab so the user can long-press.
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
          if (body?.diag) msg += ` [${body.diag}]`;
        } catch {
          // Not JSON — capture raw body snippet (e.g. Vercel error page).
          try {
            const text = await res.text();
            const snippet = text.replace(/\s+/g, " ").slice(0, 200);
            msg += ` [http=${res.status} raw=${snippet}]`;
          } catch {
            /* keep default */
          }
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
      const objectUrl = URL.createObjectURL(blob);

      if (mode === "share") {
        const shared = await tryShare(file);
        if (!shared) {
          // Share unavailable or failed — download instead. Never show a
          // technical error for this; the user still gets the file.
          triggerDownload(objectUrl, fileName);
        } else {
          // Shared successfully — clean up the object URL.
          setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
        }
      } else {
        triggerDownload(objectUrl, fileName);
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

/**
 * Try the Web Share API with a file. Returns true if the share sheet was
 * shown (user may still cancel — that's fine, returns true). Returns false
 * when sharing isn't possible so the caller can fall back to download.
 *
 * We attempt share even when navigator.canShare is missing/false-negative,
 * because some browsers (older Samsung Internet, in-app webviews) support
 * share but don't implement canShare correctly.
 */
async function tryShare(file: File): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.share) return false;
    await navigator.share({ files: [file], title: "রসিদ" });
    return true;
  } catch (err) {
    // User dismissed the share sheet — treat as handled, not a failure.
    if (err instanceof DOMException && err.name === "AbortError") return true;
    // Anything else (NotAllowedError from lost user gesture on Android,
    // DataError/TypeError on browsers without file-share support, etc.)
    // → caller falls back to download.
    return false;
  }
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
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
