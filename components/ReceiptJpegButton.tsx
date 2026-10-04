"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchReceiptImage,
  scheduleReceiptPrefetch,
  triggerDownload,
} from "@/lib/receipt-image";

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
 *
 * Speed (BUG-048): the image comes from the shared lib/receipt-image cache
 * (one render per donation, reused by the WhatsApp button too) and a
 * background prefetch starts when the card scrolls into view — so the click
 * path usually resolves in a microtask and navigator.share still fires
 * inside the browser's ~5s user-activation window.
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
  const prefetchStarted = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Early prefetch: warm the server render while the user is still reading
  // the card, not only on touchstart (which leaves no head start at all).
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
    setBusy(true);
    try {
      // Cache hit → resolves in a microtask, keeping navigator.share inside
      // the click's activation window; a cold fetch may exceed it (see
      // activation handling below).
      const entry = await fetchReceiptImage(donationId);
      const file = new File([entry.blob], entry.fileName, {
        type: "image/jpeg",
      });
      const objectUrl = URL.createObjectURL(entry.blob);

      if (mode === "share") {
        const result = await tryShare(file);
        if (result === "shared") {
          setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
        } else {
          triggerDownload(objectUrl, entry.fileName);
          if (result === "activation") {
            // NotAllowedError: the long cold render outlived the user
            // gesture. The image is now cached — tell the user one more
            // tap will open the share sheet instantly.
            window.alert("রসিদ তৈরি হয়ে গেছে — শেয়ার খুলতে আবার চাপুন");
          }
        }
      } else {
        triggerDownload(objectUrl, entry.fileName);
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
      ref={buttonRef}
      type="button"
      onClick={() => void handleClick()}
      onTouchStart={() => void fetchReceiptImage(donationId).catch(() => undefined)}
      onMouseEnter={() => void fetchReceiptImage(donationId).catch(() => undefined)}
      disabled={busy}
      className={className}
      title={title}
      aria-label={ariaLabel || title}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  );
}

type ShareResult = "shared" | "activation" | "unsupported";

/**
 * Try the Web Share API with a file.
 *  - "shared":    share sheet shown (or user cancelled — handled either way)
 *  - "activation": NotAllowedError — the gesture expired during a slow fetch;
 *                  caller should download and prompt a retry
 *  - "unsupported": no navigator.share / file-share errors — caller falls
 *                  back to download silently
 *
 * We attempt share even when navigator.canShare is missing/false-negative,
 * because some browsers (older Samsung Internet, in-app webviews) support
 * share but don't implement canShare correctly.
 */
async function tryShare(file: File): Promise<ShareResult> {
  try {
    if (typeof navigator === "undefined" || !navigator.share) {
      return "unsupported";
    }
    await navigator.share({ files: [file], title: "রসিদ" });
    return "shared";
  } catch (err) {
    // User dismissed the share sheet — treat as handled, not a failure.
    if (err instanceof DOMException && err.name === "AbortError") return "shared";
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      return "activation";
    }
    return "unsupported";
  }
}
