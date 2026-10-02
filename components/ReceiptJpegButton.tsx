"use client";

import { useRef, useState, type ReactNode } from "react";
import { toBlob, toJpeg } from "html-to-image";
import { Loader2 } from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { loadReceiptPaperProps } from "@/lib/receipt-props";
import ReceiptPaper, {
  type ReceiptPaperProps,
} from "@/components/ReceiptPaper";

type Props = {
  donationId: string;
  mode: "share" | "download";
  className?: string;
  title?: string;
  ariaLabel?: string;
  children: ReactNode;
};

/**
 * Renders the premium ReceiptPaper off-screen and exports it as a JPEG —
 * shared via the native share sheet (mode="share") or saved as a .jpg file
 * (mode="download"). Uses html-to-image (SVG foreignObject rasterization),
 * which handles Tailwind v4 oklch colors correctly (html2canvas does not).
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
  const [paperProps, setPaperProps] = useState<ReceiptPaperProps | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  function safeFileName(receiptNo: string | null): string {
    const base = (receiptNo || donationId)
      .replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, "-")
      .slice(0, 40);
    return `roshid-${base || donationId.slice(0, 8)}.jpg`;
  }

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const props = await loadReceiptPaperProps(supabase(), donationId);
      if (!props) throw new Error("রসিদের তথ্য পাওয়া যায়নি");
      setPaperProps(props);
      // Wait two frames so the off-screen receipt is fully rendered, plus
      // webfonts (Bengali) so the rasterized text uses the right glyphs.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      await document.fonts.ready;
      const node = stageRef.current;
      if (!node) throw new Error("রসিদ রেন্ডার করা যায়নি");
      const opts = {
        quality: 0.92,
        pixelRatio: 2,
        backgroundColor: "#FDFCF7",
      };
      const fileName = safeFileName(props.receiptNo);

      if (mode === "share") {
        const blob = await toBlob(node, opts);
        if (!blob) throw new Error("ছবি তৈরি করা যায়নি");
        const file = new File([blob], fileName, { type: "image/jpeg" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "রসিদ" });
        } else {
          // No file-share support (desktop browsers) — fall back to download.
          const url = URL.createObjectURL(blob);
          triggerDownload(url, fileName);
          URL.revokeObjectURL(url);
        }
      } else {
        const dataUrl = await toJpeg(node, opts);
        triggerDownload(dataUrl, fileName);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        window.alert(
          err instanceof Error ? err.message : "রসিদ শেয়ার করা যায়নি"
        );
      }
    } finally {
      setBusy(false);
      setPaperProps(null);
    }
  }

  return (
    <>
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
      {paperProps && (
        <div
          ref={stageRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: 800,
            pointerEvents: "none",
          }}
        >
          <ReceiptPaper {...paperProps} />
        </div>
      )}
    </>
  );
}

function triggerDownload(href: string, fileName: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
