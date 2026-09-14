import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupaClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { restoreFromSheets, getSheetsConfig } from "@/lib/sheets-sync";

/**
 * POST /api/restore-sheets
 * Restores database records FROM Google Sheets (backup source of truth).
 * Body: { dryRun?: boolean } — dryRun previews counts without writing.
 * Admin-only.
 *
 * Auth: the canonical server client (see /api/sync-sheets). The previous
 * manual base64- cookie parsing assumed a legacy @supabase/ssr cookie shape
 * and always returned 401 — the clients send no Authorization header.
 */
export async function POST(req: NextRequest) {
  const cfg = getSheetsConfig();
  if (!cfg) {
    return NextResponse.json({ enabled: false, message: "Google Sheets সেটআপ নেই।" });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svcKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !svcKey) {
    return NextResponse.json({ error: "অনুমিতি নেই: Supabase কনফিগারেশন সম্পূর্ণ নয় (.env.local চেক করুন)" }, { status: 401 });
  }

  // Admin guard via the canonical server client
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "অনুমিতি নেই: লগইন করুন" }, { status: 401 });
  }

  const { data: rows } = await supabase.from("users").select("role").eq("id", session.user.id).limit(1);
  const role = (rows || [])[0]?.role ?? "member";
  if (role !== "admin") {
    return NextResponse.json({ error: "শুধুমাত্র admin restore করতে পারবে" }, { status: 403 });
  }

  const svc = createSupaClient(sbUrl, svcKey);

  let body: { dryRun?: boolean } = {};
  try { body = await req.json().catch(() => ({})); } catch { /* empty */ }

  try {
    const out = await restoreFromSheets(cfg, { dryRun: Boolean(body.dryRun) });
    return NextResponse.json({ ok: true, ...out, dryRun: Boolean(body.dryRun), restoredAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
