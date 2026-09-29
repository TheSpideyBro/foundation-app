import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import QRCode from "qrcode";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // QR codes are only offered to staff on /members — enforce it here too.
  const auth = await requireAuth("staff");
  if (!auth.ok) return auth.response;

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
