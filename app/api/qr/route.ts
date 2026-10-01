import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * GET /api/qr?text=...
 * Renders a QR code PNG for arbitrary short text (e.g. receipt verify URLs).
 * Text is only *encoded* — never fetched — so there is no SSRF surface.
 * Length is capped to keep the endpoint abuse-resistant.
 */

// Light in-memory rate limit: QR encoding is CPU-bound, so blunt obvious
// abuse per instance. 60 renders/min per client IP, fail-open on any error.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  try {
    const now = Date.now();
    const rec = hits.get(ip);
    if (!rec || now >= rec.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
      // Opportunistic cleanup so the map can't grow unbounded.
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
      }
      return false;
    }
    rec.count += 1;
    return rec.count > RATE_MAX;
  } catch {
    return false; // fail-open: never block on limiter internals
  }
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(request: NextRequest) {
  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many requests, please slow down" },
      { status: 429 }
    );
  }

  const text = request.nextUrl.searchParams.get("text") ?? "";
  if (!text || text.length > 512) {
    return NextResponse.json(
      { error: "text query param required (max 512 chars)" },
      { status: 400 }
    );
  }

  let buffer: Buffer;
  try {
    buffer = await QRCode.toBuffer(text, {
      margin: 1,
      width: 240,
      color: { dark: "#064E3B", light: "#FFFFFF" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not render QR code for the given text" },
      { status: 422 }
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
