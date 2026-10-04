import { NextResponse } from "next/server";
import { requireAuth, requireUser, type AuthSuccess } from "@/lib/server-auth";
import { createReceiptShotToken } from "@/lib/receipt-shot-token";

/**
 * GET /api/receipt-image?donationId=...
 *
 * Renders the premium receipt as a JPEG on the server with headless
 * Chromium and returns the bytes.
 *
 * Access: staff may render any receipt; members may render only their own
 * (enforced by RLS on the caller's cookie-scoped client).
 *
 * Why server-side: client-side DOM→image capture (html-to-image's SVG
 * foreignObject rasterization) silently produces a blank white image on
 * iOS Safari — the canvas keeps only the background fill when drawImage
 * draws nothing. Server rendering works identically on every client.
 *
 * Speed (BUG-048): three layers keep the click→share path under a few
 * seconds —
 *   1. module-level memoized Chromium binary (downloaded at most once per
 *      warm instance, shared by concurrent renders),
 *   2. an in-memory JPEG cache (repeat shares skip render entirely),
 *   3. `load` instead of `networkidle0` for page navigation, with an
 *      explicit fonts-ready wait.
 * Stage timings are reported via `Server-Timing` / `X-Render-Timings`.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.x64.tar";

/**
 * Rendered-JPEG cache, per warm instance. TTL is short because a donation
 * edit (rare) must not serve a stale receipt for long; the HTTP layer
 * already had `max-age=300`, so this matches existing staleness bounds.
 */
const jpegCache = new Map<string, { bytes: Uint8Array<ArrayBuffer>; at: number }>();
const JPEG_TTL_MS = 5 * 60_000;
const JPEG_CACHE_MAX = 50;

function getCachedJpeg(id: string): Uint8Array<ArrayBuffer> | null {
  const hit = jpegCache.get(id);
  if (!hit) return null;
  if (Date.now() - hit.at > JPEG_TTL_MS) {
    jpegCache.delete(id);
    return null;
  }
  return hit.bytes;
}

function setCachedJpeg(id: string, bytes: Uint8Array<ArrayBuffer>): void {
  jpegCache.set(id, { bytes, at: Date.now() });
  if (jpegCache.size > JPEG_CACHE_MAX) {
    const oldest = jpegCache.keys().next();
    if (!oldest.done) jpegCache.delete(oldest.value);
  }
}

/**
 * Chromium binary path, memoized at module level: `executablePath()` extracts
 * to /tmp/chromium and short-circuits when it already exists, but without
 * this a concurrent first render could start the download twice. A failed
 * download is cleared so the next request retries.
 */
let execPathPromise: Promise<string> | null = null;

export async function GET(request: Request) {
  // Staff first; fall back to member-own access (RLS-scoped).
  const staffAuth = await requireAuth("staff");
  let auth: AuthSuccess;
  if (staffAuth.ok) {
    auth = staffAuth;
  } else if (staffAuth.response.status === 403) {
    const userAuth = await requireUser();
    if (!userAuth.ok) return userAuth.response;
    auth = userAuth;
  } else {
    return staffAuth.response;
  }

  const { searchParams } = new URL(request.url);
  const donationId = (searchParams.get("donationId") || "").trim();
  if (!donationId) {
    return NextResponse.json(
      { error: "donationId আবশ্যক" },
      { status: 400 }
    );
  }

  // RLS on the caller's client enforces visibility: staff see all rows,
  // members only their own. A missing row is a 404 either way.
  const { data: donation, error } = await auth.supabase
    .from("donations")
    .select("id, receipt_no")
    .eq("id", donationId)
    .maybeSingle();
  if (error || !donation) {
    return NextResponse.json({ error: "জমা পাওয়া যায়নি" }, { status: 404 });
  }

  const receiptNo = (donation as { receipt_no: string | null }).receipt_no;
  const safeNo = (receiptNo || donationId)
    .replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, "-")
    .slice(0, 40);
  const baseHeaders = {
    "Content-Type": "image/jpeg",
    "Cache-Control": "private, max-age=300",
    "Content-Disposition": `inline; filename="roshid-${safeNo}.jpg"`,
    "X-Receipt-No": receiptNo || "",
  };

  // Layer 2: repeat share → serve straight from the in-memory cache.
  const cached = getCachedJpeg(donationId);
  if (cached) {
    return new NextResponse(cached, {
      headers: {
        ...baseHeaders,
        "X-Receipt-Cache": "hit",
        "Server-Timing": "cache-hit;dur=0",
      },
    });
  }

  let render: RenderResult;
  let failStage = "init";
  try {
    const t0 = Date.now();
    render = await renderReceiptJpeg(
      new URL(request.url).origin,
      donationId,
      (stage) => {
        failStage = stage;
      }
    );
    render.timings.total = Date.now() - t0;
  } catch (err) {
    console.error(`[api/receipt-image] stage=${failStage}`, err);
    return NextResponse.json(
      {
        error: "রসিদের ছবি তৈরি করা যায়নি",
        // Temporary diagnostic: which pipeline stage failed + message.
        // Remove once the production issue is resolved.
        diag: `${failStage}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 300),
      },
      { status: 500 }
    );
  }

  setCachedJpeg(donationId, render.bytes);
  const renderTimings = Object.entries(render.timings)
    .map(([name, ms]) => `${name};dur=${ms}`)
    .join(", ");

  return new NextResponse(render.bytes, {
    headers: {
      ...baseHeaders,
      "X-Receipt-Cache": "miss",
      "Server-Timing": renderTimings,
      // Vercel may rewrite Server-Timing with its own metrics — keep an
      // untouched copy for diagnostics.
      "X-Render-Timings": renderTimings,
    },
  });
}

type RenderResult = {
  bytes: Uint8Array<ArrayBuffer>;
  /** Per-stage durations in ms (import, executablePath, launch, …, total). */
  timings: Record<string, number>;
};

async function renderReceiptJpeg(
  origin: string,
  donationId: string,
  onStage: (stage: string) => void
): Promise<RenderResult> {
  const timings: Record<string, number> = {};
  let current = "";
  let mark = Date.now();
  // stage(name): finalize the previous stage's timing, then report the new
  // stage as in-progress to the caller (used for error diagnostics).
  const stage = (name: string) => {
    if (current) timings[current] = Date.now() - mark;
    current = name;
    mark = Date.now();
    onStage(name);
  };

  // Lazy imports keep the heavy browser deps out of the module graph
  // unless this route actually runs.
  stage("import");
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import("@sparticuz/chromium-min"),
    import("puppeteer-core"),
  ]);

  const token = createReceiptShotToken(donationId);
  const renderUrl = `${origin}/receipt-shot/${encodeURIComponent(
    donationId
  )}?token=${encodeURIComponent(token)}`;

  // chromium-min ships no binaries: the pack is downloaded from the GitHub
  // release and extracted to /tmp at runtime. This keeps the deployment
  // small and avoids bundler path-resolution issues entirely (nothing to
  // trace — the only deployment dependency is the tiny JS package).
  stage("executablePath");
  if (!execPathPromise) {
    execPathPromise = chromium.executablePath(CHROMIUM_PACK_URL).catch((err) => {
      execPathPromise = null;
      throw err;
    });
  }
  const executablePath = await execPathPromise;

  stage("launch");
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 860, height: 1400, deviceScaleFactor: 2 },
    executablePath,
    // sparticuz v121+ ships ONLY chrome-headless-shell: puppeteer's default
    // headless:true (= new headless mode) conflicts with it and the browser
    // fails to launch. 'shell' is the only supported mode (see sparticuz README).
    headless: "shell",
  });
  try {
    stage("goto");
    const page = await browser.newPage();
    // `load` (not networkidle0): /receipt-shot is a server component with no
    // client-side fetches — load already waits for styles/fonts/QR images,
    // while networkidle0 added a mandatory 500ms+ idle tail to every render.
    const resp = await page.goto(renderUrl, { waitUntil: "load", timeout: 45000 });
    stage("find-element");
    const el = await page.$(".receipt-paper");
    if (!el) {
      const status = resp?.status() ?? -1;
      const title = await page.title().catch(() => "");
      const bodyText = await page
        .$eval("body", (b) => b.innerText.slice(0, 200))
        .catch(() => "");
      throw new Error(
        `receipt element not found (http=${status} title=${title} body=${bodyText})`
      );
    }
    stage("page-ready");
    // Font faces can settle after `load`; wait (bounded) so the screenshot
    // never catches fallback glyphs or a mid-layout paint.
    const fontsReady = page
      .evaluate(async () => {
        await document.fonts.ready;
      })
      .catch(() => undefined);
    await Promise.race([
      fontsReady,
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]);
    await new Promise<void>((resolve) => setTimeout(resolve, 150));
    stage("screenshot");
    const shot = await el.screenshot({ type: "jpeg", quality: 92 });
    // Fresh copy: Uint8Array<ArrayBuffer> — the exact type NextResponse
    // accepts as BodyInit (mirrors app/api/qr/route.ts).
    const bytes: Uint8Array<ArrayBuffer> = Uint8Array.from(shot);
    if (current) timings[current] = Date.now() - mark;
    return { bytes, timings };
  } finally {
    await browser.close();
  }
}
