import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import { restoreFromSheets, getSheetsConfig } from "@/lib/sheets-sync";

/**
 * POST /api/restore-sheets
 * Restores database records FROM Google Sheets (backup source of truth).
 * Body: { dryRun?: boolean } — dryRun previews counts without writing.
 * Admin-only.
 */
export async function POST(req: NextRequest) {
  const cfg = getSheetsConfig();
  if (!cfg) {
    return NextResponse.json({ enabled: false, message: "Google Sheets সেটআপ নেই।" });
  }

  const auth = await requireAuth("admin");
  if (!auth.ok) return auth.response;

  let body: { dryRun?: boolean } = {};
  try { body = await req.json().catch(() => ({})); } catch { /* empty */ }

  try {
    const out = await restoreFromSheets(cfg, { dryRun: Boolean(body.dryRun) });
    return NextResponse.json({ ok: true, ...out, dryRun: Boolean(body.dryRun), restoredAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
