import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { data: member, error } = await supabase
      .from("members")
      .select("id, name")
      .eq("id", id)
      .single();

    if (error || !member) throw new Error("Member not found");

    // Create a URL for the member profile (canonical)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://daulkharfoundation.vercel.app';
    const qrData = `${baseUrl}/profile/${id}`;
    
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
