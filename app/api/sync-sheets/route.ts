import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import { fullSync, getSheetsConfig } from "@/lib/sheets-sync";

/**
 * POST /api/sync-sheets
 * Runs a full sync: pulls Members, Donations, Expenses from the database
 * and overwrites the corresponding Google Sheets tabs (source of truth = DB).
 * Returns { enabled: false } when Google Sheets is not configured.
 * Admin-only.
 */
export async function POST() {
  const cfg = getSheetsConfig();
  if (!cfg) {
    return NextResponse.json({ enabled: false, message: "Google Sheets সেটআপ করা হয়নি — .env.local-এ GOOGLE_SERVICE_ACCOUNT_JSON ও GOOGLE_SHEET_ID যোগ করুন।" });
  }

  const auth = await requireAuth("admin");
  if (!auth.ok) return auth.response;

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
