/**
 * Shared client-side cache + prefetch scheduler for GET /api/receipt-image.
 *
 * Why: every share/download of a receipt used to trigger its own server-side
 * Chromium render (multi-second, or 30-40s on a cold instance where the
 * browser binary is still downloading). Two problems followed:
 *   - ReceiptJpegButton and WhatsAppShareButton on the same card rendered
 *     the SAME receipt twice.
 *   - navigator.share() fired after the long await was outside the browser's
 *     ~5s user-activation window → NotAllowedError → share sheet never opened
 *     (only a second click, served from the HTTP cache, worked).
 *
 * This module gives both buttons ONE fetch per donation (in-flight dedupe),
 * a 5-minute blob cache (re-usable after object URLs are revoked), and a
 * concurrency-limited prefetch queue so images start rendering when a card
 * scrolls into view — typically finishing well before the user taps.
 *
 * Only blob data is cached here; consumers create their own object URLs per
 * click and revoke them after use (a revoked object URL can never poison the
 * cache).
 */

import { makeReceiptFileName } from "@/lib/utils";

export type ReceiptImageEntry = {
  blob: Blob;
  fileName: string;
};

const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX = 30;

/** Prefetch: at most one render in flight, bounded backlog. */
const PREFETCH_DELAY_MS = 800;
const MAX_PARALLEL = 1;
const MAX_QUEUE = 8;

const cache = new Map<string, { entry: ReceiptImageEntry; at: number }>();
const inflight = new Map<string, Promise<ReceiptImageEntry>>();
const scheduled = new Set<string>();
const queued = new Set<string>();
let running = 0;

function pruneCache(): void {
  const now = Date.now();
  for (const [id, hit] of cache) {
    if (now - hit.at > CACHE_TTL_MS) cache.delete(id);
  }
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

/** Synchronous cache probe — returns a live entry or null. */
export function getCachedReceiptImage(donationId: string): ReceiptImageEntry | null {
  const hit = cache.get(donationId);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(donationId);
    return null;
  }
  return hit.entry;
}

async function download(donationId: string): Promise<ReceiptImageEntry> {
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
  const entry: ReceiptImageEntry = {
    blob,
    fileName: makeReceiptFileName(base || donationId.slice(0, 8)),
  };
  cache.set(donationId, { entry, at: Date.now() });
  pruneCache();
  return entry;
}

/**
 * Fetch (or reuse) the receipt JPEG. Concurrent callers for the same
 * donation share a single request; a cache hit resolves in a microtask, so
 * navigator.share() still fires inside the click's activation window.
 */
export function fetchReceiptImage(donationId: string): Promise<ReceiptImageEntry> {
  const hit = getCachedReceiptImage(donationId);
  if (hit) return Promise.resolve(hit);
  const existing = inflight.get(donationId);
  if (existing) return existing;
  const request = download(donationId).finally(() => {
    inflight.delete(donationId);
  });
  inflight.set(donationId, request);
  return request;
}

async function pump(): Promise<void> {
  while (running < MAX_PARALLEL) {
    const next = queued.values().next();
    if (next.done) return;
    const id = next.value;
    queued.delete(id);
    running++;
    try {
      await fetchReceiptImage(id);
    } catch {
      // Prefetch failure is fine — the click path surfaces errors.
    } finally {
      running--;
    }
  }
}

/**
 * Queue a background prefetch (IntersectionObserver / early hint). Starts
 * after a short delay so it never competes with the initial page render, and
 * is deduped against cache/in-flight/queued state.
 */
export function scheduleReceiptPrefetch(donationId: string): void {
  if (
    cache.has(donationId) ||
    inflight.has(donationId) ||
    scheduled.has(donationId) ||
    queued.has(donationId)
  ) {
    return;
  }
  scheduled.add(donationId);
  setTimeout(() => {
    scheduled.delete(donationId);
    if (cache.has(donationId) || inflight.has(donationId)) return;
    if (queued.size >= MAX_QUEUE) return;
    queued.add(donationId);
    void pump();
  }, PREFETCH_DELAY_MS);
}

/** iOS Safari ignores the `download` attribute — iOS check first. */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function triggerDownload(href: string, fileName: string): void {
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
