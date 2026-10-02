import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import QRCode from "qrcode";

// S-L2: same in-memory limiter pattern as /api/qr — QR encoding is
// CPU-bound. 60 renders/min per client IP, fail-open on limiter errors.
// Known weakness (same as /api/qr): per-instance state, spoofable
// X-Forwarded-For — a second layer only; real throttling belongs at the edge.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  try {
    const now = Date.now();
    const rec = hits.get(ip);
    if (!rec || now >= rec.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
      }
      return false;
    }
    rec.count += 1;
    return rec.count > RATE_MAX;
  } catch {
    return false;
  }
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // QR codes are only offered to staff on /members — enforce it here too.
  const auth = await requireAuth("staff");
  if (!auth.ok) return auth.response;

  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many requests, please slow down" },
      { status: 429 }
    );
  }

  const { id } = await params;

  try {
    const { data: member, error } = await auth.supabase
      .from("members")
      .select("id, name")
      .eq("id", id)
      .single();

    if (error || !member) throw new Error("Member not found");

    // Canonical member page (admin/members/[id]) — /profile/{id} does not
    // exist and every generated code used to scan to a 404.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://daulkharfoundation.vercel.app';
    const qrData = `${baseUrl}/admin/members/${id}`;

    const qrImage = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: {
        dark: "#065f46", // emerald-800
        light: "#ffffff"
      }
    });

    return NextResponse.json({ qrImage, name: member.name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
