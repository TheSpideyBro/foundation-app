import { NextResponse } from "next/server";
import { createClient as createSupaClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { fullSync, getSheetsConfig } from "@/lib/sheets-sync";

/**
 * POST /api/sync-sheets
 * Runs a full sync: pulls Members, Donations, Expenses from the database
 * and overwrites the corresponding Google Sheets tabs (source of truth = DB).
 * Returns { enabled: false } when Google Sheets is not configured.
 * Admin-only (checks the session user's role in the users table).
 */
export async function POST() {
  const cfg = getSheetsConfig();
  if (!cfg) {
    return NextResponse.json({ enabled: false, message: "Google Sheets সেটআপ করা হয়নি — .env.local-এ GOOGLE_SERVICE_ACCOUNT_JSON ও GOOGLE_SHEET_ID যোগ করুন।" });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svcKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !svcKey) {
    return NextResponse.json({ error: "অনুমিতি নেই: Supabase কনফিগারেশন সম্পূর্ণ নয় (.env.local চেক করুন)" }, { status: 401 });
  }

  // Admin guard via the canonical server client. This reads the browser's
  // session cookie through @supabase/ssr (same proven pattern as
  // /api/receipts/[id]). The manual base64- cookie parsing this replaced
  // assumed a legacy cookie shape that v0.12 no longer writes, so every call
  // failed with 401. The clients (dashboard/admin pages) send NO Authorization
  // header, so the cookie is the only credential.
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "অনুমিতি নেই: লগইন করুন" }, { status: 401 });
  }

  const { data: rows } = await supabase.from("users").select("role").eq("id", session.user.id).limit(1);
  const role = (rows || [])[0]?.role ?? "member";
  if (role !== "admin") {
    return NextResponse.json({ error: "শুধুমাত্র admin এই কাজ করতে পারবে" }, { status: 403 });
  }

  const svc = createSupaClient(sbUrl, svcKey);

  try {
    const out = await fullSync(cfg);
    return NextResponse.json({ ok: true, ...out, syncedAt: new Date().toISOString()});
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}

/** GET: lightweight status — whether sheets sync is configured. */
export async function GET() {
  return NextResponse.json({ enabled: Boolean(getSheetsConfig()) });
}
