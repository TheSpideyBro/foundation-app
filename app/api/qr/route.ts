import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * GET /api/qr?text=...
 * Renders a QR code PNG for arbitrary short text (e.g. receipt verify URLs).
 * Text is only *encoded* — never fetched — so there is no SSRF surface.
 * Length is capped to keep the endpoint abuse-resistant.
 */
export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text") ?? "";
  if (!text || text.length > 512) {
    return NextResponse.json(
      { error: "text query param required (max 512 chars)" },
      { status: 400 }
    );
  }

  const buffer = await QRCode.toBuffer(text, {
    margin: 1,
    width: 240,
    color: { dark: "#064E3B", light: "#FFFFFF" },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
