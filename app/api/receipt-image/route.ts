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
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  let jpeg: Uint8Array<ArrayBuffer>;
  try {
    jpeg = await renderReceiptJpeg(
      new URL(request.url).origin,
      donationId
    );
  } catch (err) {
    console.error("[api/receipt-image]", err);
    return NextResponse.json(
      { error: "রসিদের ছবি তৈরি করা যায়নি" },
      { status: 500 }
    );
  }

  const receiptNo = (donation as { receipt_no: string | null }).receipt_no;
  const safeNo = (receiptNo || donationId)
    .replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, "-")
    .slice(0, 40);
  return new NextResponse(jpeg, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="roshid-${safeNo}.jpg"`,
      "X-Receipt-No": receiptNo || "",
    },
  });
}

async function renderReceiptJpeg(
  origin: string,
  donationId: string
): Promise<Uint8Array<ArrayBuffer>> {
  // Lazy imports keep the heavy browser deps out of the module graph
  // unless this route actually runs.
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);

  const token = createReceiptShotToken(donationId);
  const renderUrl = `${origin}/receipt-shot/${encodeURIComponent(
    donationId
  )}?token=${encodeURIComponent(token)}`;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 860, height: 1400, deviceScaleFactor: 2 },
    executablePath: await chromium.executablePath(),
    // Note: @sparticuz/chromium bakes --headless='shell' into args;
    // do not pass headless here.
  });
  try {
    const page = await browser.newPage();
    await page.goto(renderUrl, { waitUntil: "networkidle0", timeout: 45000 });
    const el = await page.$(".receipt-paper");
    if (!el) throw new Error("receipt element not found");
    const shot = await el.screenshot({ type: "jpeg", quality: 92 });
    // Fresh copy: Uint8Array<ArrayBuffer> — the exact type NextResponse
    // accepts as BodyInit (mirrors app/api/qr/route.ts).
    const bytes: Uint8Array<ArrayBuffer> = Uint8Array.from(shot);
    return bytes;
  } finally {
    await browser.close();
  }
}
