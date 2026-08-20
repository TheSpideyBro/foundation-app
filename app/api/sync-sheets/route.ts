import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fullSync, getSheetsConfig } from "@/lib/sheets-sync";

/**
 * POST /api/sync-sheets
 * Runs a full sync: pulls Members, Donations, Expenses from the database
 * and overwrites the corresponding Google Sheets tabs (source of truth = DB).
 * Returns { enabled: false } when Google Sheets is not configured.
 * Admin-only (checks the session user's role in the users table).
 */
export async function POST(req: NextRequest) {
  const cfg = getSheetsConfig();
  if (!cfg) {
    return NextResponse.json({ enabled: false, message: "Google Sheets সেটআপ করা হয়নি — .env.local-এ GOOGLE_SERVICE_ACCOUNT_JSON ও GOOGLE_SHEET_ID যোগ করুন।" });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const svcKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey || !svcKey) {
    return NextResponse.json({ error: "অনুমিতি নেই: Supabase কনফিগারেশন সম্পূর্ণ নয় (.env.local চেক করুন)" }, { status: 401 });
  }

  // Admin guard — explicitly extract the access token. IMPORTANT: this
  // route previously used createServerClient + getUser(), which only works
  // when the session cookie store is populated via setAll (middleware flow).
  // With the browser's sb-*-auth-token cookie set directly, getUser() does
  // NOT read it, producing a false "লগইন করুন" 401. Reading the token
  // cookie / Authorization header manually and passing it as Bearer is
  // reliable in all hosting modes (localhost, standalone, Vercel).
  const tokenCookie = req.cookies.getAll().find((c) => /^sb-.*-auth-token$/.test(c.name));
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  // PRIMARY: Authorization header (sent by the client from getSession());
  // FALLBACK: token cookie. A broken/stale cookie must never beat a valid
  // header.
  let rawToken = (bearer || tokenCookie?.value || "").trim();
  // Normalize a token cookie that got percent-decoded as "undefined".
  if (rawToken === "undefined") rawToken = "";
  // The browser may store the whole session object in a chunked cookie as
  // "base64-<base64url-json>". Decode it and pull out access_token.
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

  // Validate JWT shape BEFORE sending to Supabase so a stale / chunked /
  // corrupted cookie gives a friendly hint instead of the raw
  // "token is malformed: invalid number of segments" error.
  const isJwt = accessToken.split(".").length === 3;
  if (!isJwt) {
    return NextResponse.json({ error: "সেশন কুকি ভাঙা (corrupt) — একবার লগআউট করে আবার লগইন করুন", statusHint: "logout-then-login" }, { status: 401 });
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
    return NextResponse.json({ error: "শুধুমাত্র admin এই কাজ করতে পারবে" }, { status: 403 });
  }

  try {
    const out = await fullSync(cfg);
    return NextResponse.json({ ok: true, ...out, syncedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}

/** GET: lightweight status — whether sheets sync is configured. */
export async function GET() {
  return NextResponse.json({ enabled: Boolean(getSheetsConfig()) });
}
