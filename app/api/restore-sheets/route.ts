import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { restoreFromSheets, getSheetsConfig } from "@/lib/sheets-sync";

/**
 * POST /api/restore-sheets
 * Restores database records FROM Google Sheets (backup source of truth).
 * Body: { dryRun?: boolean } — dryRun previews counts without writing.
 * Admin-only.
 *
 * Auth (identical to /api/sync-sheets): the client (admin page) sends the
 * current access token in the Authorization header (from getSession()),
 * which is PRIMARY. The sb-*-auth-token cookie is only a FALLBACK. A
 * broken/stale cookie never beats a valid Bearer header, and malformed JWT
 * values are rejected with a friendly hint before reaching Supabase.
 */
export async function POST(req: NextRequest) {
  const cfg = getSheetsConfig();
  if (!cfg) {
    return NextResponse.json({ enabled: false, message: "Google Sheets সেটআপ নেই।" });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const svcKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey || !svcKey) {
    return NextResponse.json({ error: "অনুমিতি নেই: Supabase কনফিগারেশন সম্পূর্ণ নয় (.env.local চেক করুন)" }, { status: 401 });
  }

  // Auth — PRIMARY: Authorization header; FALLBACK: token cookie
  const tokenCookie = req.cookies.getAll().find((c) => /^sb-.*-auth-token$/.test(c.name));
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let rawToken = (bearer || tokenCookie?.value || "").trim();
  if (rawToken === "undefined") rawToken = "";
  // Chunked session cookie: "base64-<base64url-json>" → decode & use access_token
  let accessToken = rawToken;
  if (rawToken.startsWith("base64-")) {
    try {
      const json = Buffer.from(rawToken.slice(7), "base64url").toString("utf8");
      const parsed = JSON.parse(json);
      accessToken = typeof parsed?.access_token === "string" ? parsed.access_token : "";
    } catch {
      accessToken = "";
    }
  }
  if (!accessToken) {
    return NextResponse.json({ error: "অনুমিতি নেই: লগইন করুন" }, { status: 401 });
  }

  const isJwt = accessToken.split(".").length === 3;
  if (!isJwt) {
    return NextResponse.json({ error: "সেশন কুকি ভাঙা (corrupt) — একবার লগআউট করে আবার লগইন করুন" }, { status: 401 });
  }

  const supa = createClient(sbUrl, sbKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  const { data: { user }, error: authError } = await supa.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: `অনুমিতি নেই: সেশন অবৈধ — ${authError?.message || "লগ আউট করে আবার লগইন করুন"}` }, { status: 401 });
  }

  const svc = createClient(sbUrl, svcKey);
  const { data: rows } = await svc.from("users").select("role").eq("id", user.id).limit(1);
  const role = (rows || [])[0]?.role ?? "member";
  if (role !== "admin") {
    return NextResponse.json({ error: "শুধুমাত্র admin restore করতে পারবে" }, { status: 403 });
  }

  let body: { dryRun?: boolean } = {};
  try { body = await req.json().catch(() => ({})); } catch { /* empty */ }

  try {
    const out = await restoreFromSheets(cfg, { dryRun: Boolean(body.dryRun) });
    return NextResponse.json({ ok: true, ...out, dryRun: Boolean(body.dryRun), restoredAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
