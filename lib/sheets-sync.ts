/**
 * Google Sheets backup/sync library
 * ----------------------------------
 * - Accesses Google Sheets via a Service Account (server-side only).
 * - Used by API routes: /api/sync-sheets (full sync + incremental),
 *   /api/restore-sheets (restore DB from sheet).
 *
 * One-time setup (documented in docs/google-sheets-setup.md):
 *   1. Create service account in Google Cloud, download JSON key
 *   2. Create a spreadsheet; share it with the service account email (Editor)
 *   3. Add to .env.local:
 *        GOOGLE_SERVICE_ACCOUNT_JSON=<contents of JSON key file>
 *        GOOGLE_SHEET_ID=<spreadsheet id from its URL>
 *   4. Tabs MUST be named: Members, Donations, Expenses (created by full-sync
 *      if missing)
 */

import { SignJWT, importPKCS8, decodeProtectedHeader } from "jose";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SheetsConfig {
  jsonKey: string;   // raw service account JSON (string)
  spreadsheetId: string;
}

export function getSheetsConfig(): SheetsConfig | null {
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!jsonKey || !spreadsheetId) return null;
  return { jsonKey, spreadsheetId };
}

function parseKey(jsonKey: string) {
  let raw = jsonKey.trim();
  // Defense-in-depth: some env loaders / platforms deliver the value with
  // stray outer quotes (e.g. JSON-encoded string) or mangled quotes.
  try {
    const key = JSON.parse(raw);
    if (key.client_email && key.private_key) return key;
  } catch {
    // fall through to normalization attempts below
  }
  if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
  // Only now convert literal \n sequences into real newlines (never on the
  // first attempt — the private key's JSON escape \n must stay intact).
  if (raw.includes("\\n")) raw = raw.replace(/\\n/g, "\n");
  const key = JSON.parse(raw);
  if (!key.client_email || !key.private_key) throw new Error("invalid service account key");
  return key;
}

// ---------- JWT + access token (cached) ----------
let tokenCache: { token: string; expires: number } | null = null;

async function getAccessToken(jsonKey: string): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expires - 60_000) return tokenCache.token;
  const key = parseKey(jsonKey);
  const privateKey = await importPKCS8(key.private_key, "RS256");

  async function exchange(issuedAt: number) {
    const jwt = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(key.client_email)
      .setSubject(key.client_email)
      .setAudience(TOKEN_URL)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + 3600)
      .sign(privateKey);
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: GRANT_TYPE, assertion: jwt }).toString(),
    });
    const body = await res.json();
    if (!body.access_token) return body;
    tokenCache = { token: body.access_token, expires: Date.now() + body.expires_in * 1000 };
    return body;
  }

  let body = await exchange(Math.floor(Date.now() / 1000));
  // Google rejects the token when the host's clock has drifted beyond its
  // ~10-minute tolerance ("Token must be a short-lived token..."). Retry once
  // with a backdated iat to tolerate up to ~10 min of clock skew automatically.
  if (!body.access_token && /short-lived|iat|not yet valid|invalid_grant/i.test(body.error_description || "")) {
    body = await exchange(Math.floor(Date.now() / 1000) - 300);
  }
  if (!body.access_token) {
    const desc = body.error_description || JSON.stringify(body);
    let hint = "";
    if (/short-lived|iat/i.test(desc)) {
      hint = " | Fix: turn on 'Set time automatically' in Windows Date and time settings and press 'Sync now'";
    }
    throw new Error(`Google token error: ${desc}${hint}`);
  }
  return body.access_token;
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ---------- low-level helpers ----------
export async function ensureTabs(cfg: SheetsConfig, token: string, tabs: string[]) {
  // Read existing tab titles; create missing ones
  const meta = await fetch(`${BASE}/${cfg.spreadsheetId}`, { headers: headers(token) });
  const metaJson = await meta.json();
  if (!metaJson.sheets) throw new Error(`sheet meta error: ${JSON.stringify(metaJson).slice(0, 200)}`);
  const existing = (metaJson.sheets as any[]).map((s) => s.properties.title);
  const toCreate = tabs.filter((t) => !existing.includes(t));
  for (const t of toCreate) {
    const r = await fetch(`${BASE}/${cfg.spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: t, gridProperties: { rowCount: 1000, columnCount: 12 } } } }],
      }),
    });
    if (!r.ok) throw new Error(`create tab ${t} failed: ${await r.text()}`);
  }
}

/** Overwrite a whole sheet starting at A1 (header row = first array element). */
export async function writeRange(
  cfg: SheetsConfig, token: string, tab: string, values: (string | number)[][]
) {
  const r = await fetch(
    `${BASE}/${cfg.spreadsheetId}/values/${encodeURIComponent(tab)}!A1:Z1000:clear`,
    { method: "POST", headers: headers(token) }
  );
  if (!r.ok) throw new Error(`clear ${tab}: ${await r.text()}`);
  const w = await fetch(
    `${BASE}/${cfg.spreadsheetId}/values/${encodeURIComponent(tab)}!A1?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: headers(token),
      body: JSON.stringify({ majorDimension: "ROWS", values }),
    }
  );
  if (!w.ok) throw new Error(`write ${tab}: ${await w.text()}`);
  return await w.json();
}

/** Read a whole sheet. */
export async function readRange(cfg: SheetsConfig, token: string, tab: string) {
  const r = await fetch(`${BASE}/${cfg.spreadsheetId}/values/${encodeURIComponent(tab)}`, { headers: headers(token) });
  if (!r.ok) throw new Error(`read ${tab}: ${await r.text()}`);
  const body = await r.json();
  return (body.values as (string | number)[][]) || [];
}

// ---------- typed row projections ----------
export interface MemberRow { id: string; name: string; phone: string; address: string; join_date: string; status: string; monthly_pledge: number; created_at: string }
export interface DonationRow { id: string; member_id: string; member_name: string; amount: number; date: string; method: string; receipt_no: string; received_by: string; donation_month: string; created_at: string }
export interface ExpenseRow { id: string; category: string; amount: number; date: string; description: string; proof_url: string; created_at: string }

export const MEMBERS_HEADER = ["id", "name", "phone", "address", "join_date", "status", "monthly_pledge", "created_at"];
export const DONATIONS_HEADER = ["id", "member_id", "member_name", "amount", "date", "method", "receipt_no", "received_by", "donation_month", "created_at"];
export const EXPENSES_HEADER = ["id", "category", "amount", "date", "description", "proof_url", "created_at"];

// ---------- full sync (source of truth = DB) ----------
import { createClient } from "@supabase/supabase-js";

function serviceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fullSync(cfg: SheetsConfig): Promise<{ sheets: Record<string, number>; tabStatus: string; formattedTabs: string[] }> {
  const token = await getAccessToken(cfg.jsonKey);
  await ensureTabs(cfg, token, ["Members", "Donations", "Expenses"]);

  const supa = serviceRoleClient();
  const [members, donations, expenses] = await Promise.all([
    supa.from("members").select("*").order("created_at", { ascending: true }),
    supa.from("donations").select("*, members(name)").order("created_at", { ascending: true }),
    supa.from("expenses").select("*").order("created_at", { ascending: true }),
  ]);
  if (members.error) throw new Error(`members read: ${members.error.message}`);
  if (donations.error) throw new Error(`donations read: ${donations.error.message}`);
  if (expenses.error) throw new Error(`expenses read: ${expenses.error.message}`);

  const memById = new Map((members.data || []).map((m) => [m.id, m]));

  const mRows = [MEMBERS_HEADER, ...(members.data || []).map((m: any) => [
    m.id, m.name, m.phone ?? "", m.address ?? "", m.join_date, m.status, Number(m.monthly_pledge ?? 0), m.created_at,
  ])];
  const dRows = [DONATIONS_HEADER, ...(donations.data || []).map((d: any) => [
    d.id, d.member_id, memById.get(d.member_id)?.name ?? "", Number(d.amount), d.date, d.method, d.receipt_no, d.received_by ?? "", d.donation_month ?? "", d.created_at,
  ])];
  const eRows = [EXPENSES_HEADER, ...(expenses.data || []).map((e: any) => [
    e.id, e.category, Number(e.amount), e.date, e.description ?? "", e.proof_url ?? "", e.created_at,
  ])];

  await Promise.all([
    writeRange(cfg, token, "Members", mRows),
    writeRange(cfg, token, "Donations", dRows),
    writeRange(cfg, token, "Expenses", eRows),
  ]);

    // Apply the modern Bengali header row + professional styling so the sheet
  // always looks presentable after every sync (row-1 headers are display-only;
  // restoreFromSheets reads rows by column position, so Bengali labels are safe).
  const fmt = await formatSheets(cfg, token);
  return {
    sheets: { Members: mRows.length - 1, Donations: dRows.length - 1, Expenses: eRows.length - 1 },
    tabStatus: "Members ✓ | Donations ✓ | Expenses ✓",
    formattedTabs: fmt,
  };
}

// ---------- restore (source of truth = Sheets) ----------
export interface RestoreResult {
  members: { added: number; updated: number };
  donations: { added: number; updated: number };
  expenses: { added: number; updated: number };
}

export async function restoreFromSheets(cfg: SheetsConfig, opts: { dryRun?: boolean } = {}): Promise<RestoreResult> {
  const token = await getAccessToken(cfg.jsonKey);
  const [mVals, dVals, eVals] = await Promise.all([
    readRange(cfg, token, "Members"),
    readRange(cfg, token, "Donations"),
    readRange(cfg, token, "Expenses"),
  ]);

  const supa = serviceRoleClient();
  const result: RestoreResult = {
    members: { added: 0, updated: 0 },
    donations: { added: 0, updated: 0 },
    expenses: { added: 0, updated: 0 },
  };

  const dataRows = (vals: (string | number)[][]) => vals.slice(1).filter((r) => r && r.length > 0 && String(r[0]).trim() !== "");

  // Members restore — members.user_id is NOT in the sheet. Restore only non-null
  // user_id rows if present in sheet (legacy), else attach to first admin user.
  const admins = await supa.from("users").select("id").eq("role", "admin").limit(1);
  const fallbackUserId = admins.data?.[0]?.id ?? null;

  const mRows = dataRows(mVals);
  for (const r of mRows) {
    const [id, name, phone, address, joinDate, status, pledge] = r;
    const row: any = { id: String(id), name: String(name), phone: String(phone || ""), address: String(address || ""), join_date: joinDate || null, status: ["active", "inactive"].includes(String(status)) ? status : "active", monthly_pledge: Number(pledge ?? 0) };
    const existing = await supa.from("members").select("id").eq("id", row.id);
    if ((existing.data || []).length > 0) {
      if (!opts.dryRun) await supa.from("members").update(row).eq("id", row.id);
      result.members.updated++;
    } else {
      row.user_id = (r as any)[7] || fallbackUserId; // sheet col 8 (legacy) or admin fallback
      if (row.user_id) {
        if (!opts.dryRun) await supa.from("members").insert(row);
        result.members.added++;
      }
    }
  }

  const dRows = dataRows(dVals);
  for (const r of dRows) {
    const [id, memberId, , amount, date, method, receiptNo, receivedBy, month] = r;
    const row: any = {
      id: String(id), member_id: String(memberId), amount: Number(amount), date: date || null,
      method: ["cash", "bkash", "nagad", "bank"].includes(String(method)) ? method : "cash",
      receipt_no: String(receiptNo || ""), received_by: String(receivedBy || ""), donation_month: month || null,
    };
    const existing = await supa.from("donations").select("id").eq("id", row.id);
    if ((existing.data || []).length > 0) {
      if (!opts.dryRun) await supa.from("donations").update(row).eq("id", row.id);
      result.donations.updated++;
    } else {
      const mem = await supa.from("members").select("id").eq("id", row.member_id);
      if ((mem.data || []).length > 0) {
        if (!opts.dryRun) await supa.from("donations").insert(row);
        result.donations.added++;
      }
    }
  }

  const eRows = dataRows(eVals);
  for (const r of eRows) {
    const [id, category, amount, date, description, proofUrl] = r;
    const row: any = {
      id: String(id), category: String(category), amount: Number(amount), date: date || null,
      description: String(description || ""), proof_url: String(proofUrl || ""),
    };
    const existing = await supa.from("expenses").select("id").eq("id", row.id);
    if ((existing.data || []).length > 0) {
      if (!opts.dryRun) await supa.from("expenses").update(row).eq("id", row.id);
      result.expenses.updated++;
    } else {
      if (!opts.dryRun) await supa.from("expenses").insert(row);
      result.expenses.added++;
    }
  }

  return result;
}

// ---------- sheet styling (Bengali display headers + modern look) ----------
const HEADER_DISPLAY: Record<string, string[]> = {
  Members: ["সদস্য আইডি", "নাম", "ফোন", "ঠিকানা", "যোগদান", "অবস্থা", "মাসিক প্রতিশ্রুতি (৳)", "তৈরির তারিখ"],
  Donations: ["দান আইডি", "সদস্য আইডি", "সদস্যের নাম", "পরিমাণ (৳)", "তারিখ", "পদ্ধতি", "রসিদ নম্বর", "গ্রহণকারী", "মাস", "তৈরির তারিখ"],
  Expenses: ["খরচ আইডি", "ক্যাটাগরি", "পরিমাণ (৳)", "তারিখ", "বিবরণ", "প্রমাণ (URL)", "তৈরির তারিখ"],
};
const COL_WIDTHS: Record<string, number[]> = {
  Members: [150, 140, 130, 180, 110, 90, 120, 150],
  Donations: [150, 150, 120, 100, 110, 100, 110, 120, 120, 150],
  Expenses: [150, 120, 100, 110, 220, 150, 150],
};
const AMOUNT_COL: Record<string, number> = { Members: 7, Donations: 4, Expenses: 3 };
// column index (0-based) of the currency column per tab (last amount col)
const GREEN: [number, number, number] = [0.106, 0.263, 0.2]; // #1B4332
const GOLD: [number, number, number] = [0.788, 0.592, 0.176]; // #C9972D
const CREAM: [number, number, number] = [0.969, 0.957, 0.933]; // #F7F4EE
const MIST: [number, number, number] = [0.933, 0.945, 0.925]; // #EFF1EC
const GRID: [number, number, number] = [0.8, 0.8, 0.77];

const SUMMARY_WIDTHS: number[] = [300, 160, 70]; // label, value, unit
const HIGHLIGHT: [number, number, number] = [0.937, 0.871, 0.659]; // gold-tint highlight row

function styleSummaryRequestBatch(sheetId: number): Record<string, unknown>[] {
  const batch: Record<string, unknown>[] = [];
  // Row 1 — title banner: dark green, merged, white bold 14pt
  batch.push(
    { updateCells: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
      rows: [{ values: Array.from({ length: 5 }, () => ({ userEnteredFormat: {
        backgroundColor: { red: GREEN[0], green: GREEN[1], blue: GREEN[2] },
        horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
        textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 }, fontFamily: "Noto Sans Bengali" },
      } })) }],
    } },
    { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 }, mergeType: "MERGE_ALL" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 40 }, fields: "pixelSize" } },
    // Row 2 — subtitle banner: gold, merged, dark bold 11pt
    { updateCells: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 5 },
      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
      rows: [{ values: Array.from({ length: 5 }, () => ({ userEnteredFormat: {
        backgroundColor: { red: GOLD[0], green: GOLD[1], blue: GOLD[2] },
        horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
        textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 0.1, green: 0.1, blue: 0.1 }, fontFamily: "Noto Sans Bengali" },
      } })) }],
    } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 5 }, mergeType: "MERGE_ALL" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: 2 }, properties: { pixelSize: 26 }, fields: "pixelSize" } },
    // Row 4 — column header: dark green band with gold bottom border
    { updateCells: {
      range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 3 },
      fields: "userEnteredFormat(backgroundColor,textFormat,borders)",
      rows: [{ values: Array.from({ length: 3 }, () => ({ userEnteredFormat: {
        backgroundColor: { red: GREEN[0], green: GREEN[1], blue: GREEN[2] },
        horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
        textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 }, fontFamily: "Noto Sans Bengali" },
        borders: { bottom: { style: "SOLID_MEDIUM", color: { red: GOLD[0], green: GOLD[1], blue: GOLD[2] } } },
      } })) }],
    } },
    // Rows 5-12 — data rows: alternating mist/cream
    { repeatCell: {
      range: { sheetId, startRowIndex: 4, endRowIndex: 12, startColumnIndex: 0, endColumnIndex: 3 },
      cell: { userEnteredFormat: { backgroundColor: { red: MIST[0], green: MIST[1], blue: MIST[2] } } },
      fields: "userEnteredFormat.backgroundColor",
    } },
    // Rows 5-12 even rows — cream
    { repeatCell: {
      range: { sheetId, startRowIndex: 5, endRowIndex: 12, startColumnIndex: 0, endColumnIndex: 3 },
      cell: { userEnteredFormat: { backgroundColor: { red: CREAM[0], green: CREAM[1], blue: CREAM[2] } } },
      fields: "userEnteredFormat.backgroundColor",
    } },
    // Row 13 — total/balance highlight: gold tint, bold, gold top border
    { updateCells: {
      range: { sheetId, startRowIndex: 12, endRowIndex: 13, startColumnIndex: 0, endColumnIndex: 3 },
      fields: "userEnteredFormat(backgroundColor,textFormat,borders)",
      rows: [{ values: Array.from({ length: 3 }, () => ({ userEnteredFormat: {
        backgroundColor: { red: HIGHLIGHT[0], green: HIGHLIGHT[1], blue: HIGHLIGHT[2] },
        horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
        textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 0.1, green: 0.1, blue: 0.1 }, fontFamily: "Noto Sans Bengali" },
        borders: { top: { style: "SOLID_MEDIUM", color: { red: GOLD[0], green: GOLD[1], blue: GOLD[2] } } },
      } })) }],
    } },
    // Stat labels (col A, rows 5-13) — bold green, left aligned; values (col B) — big bold centered; units (col C) — small centered
    { repeatCell: {
      range: { sheetId, startRowIndex: 4, endRowIndex: 13, startColumnIndex: 0, endColumnIndex: 1 },
      cell: { userEnteredFormat: {
        horizontalAlignment: "LEFT", verticalAlignment: "MIDDLE",
        textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 0.1, green: 0.35, blue: 0.25 }, fontFamily: "Noto Sans Bengali" },
      } },
      fields: "userEnteredFormat(horizontalAlignment,textFormat,verticalAlignment)",
    } },
    { repeatCell: {
      range: { sheetId, startRowIndex: 4, endRowIndex: 13, startColumnIndex: 1, endColumnIndex: 2 },
      cell: { userEnteredFormat: {
        horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
        textFormat: { bold: true, fontSize: 12, fontFamily: "Noto Sans Bengali" },
      } },
      fields: "userEnteredFormat(horizontalAlignment,textFormat,verticalAlignment)",
    } },
    { repeatCell: {
      range: { sheetId, startRowIndex: 4, endRowIndex: 13, startColumnIndex: 2, endColumnIndex: 3 },
      cell: { userEnteredFormat: {
        horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
        textFormat: { bold: false, fontSize: 9, foregroundColor: { red: 0.4, green: 0.4, blue: 0.38 }, fontFamily: "Noto Sans Bengali" },
      } },
      fields: "userEnteredFormat(horizontalAlignment,textFormat,verticalAlignment)",
    } },
    // Borders around the stats block A4:C13
    { updateBorders: {
      range: { sheetId, startRowIndex: 3, endRowIndex: 13, startColumnIndex: 0, endColumnIndex: 3 },
      top: { style: "SOLID_MEDIUM", color: { red: GOLD[0], green: GOLD[1], blue: GOLD[2] } },
      bottom: { style: "SOLID_MEDIUM", color: { red: GOLD[0], green: GOLD[1], blue: GOLD[2] } },
      left: { style: "SOLID", color: { red: GRID[0], green: GRID[1], blue: GRID[2] } },
      right: { style: "SOLID", color: { red: GRID[0], green: GRID[1], blue: GRID[2] } },
      innerHorizontal: { style: "DOTTED", color: { red: 0.87, green: 0.87, blue: 0.84 } },
      innerVertical: { style: "SOLID", color: { red: GRID[0], green: GRID[1], blue: GRID[2] } },
    } },
    // Row 15 — note: merged, italic gray, left aligned
    { updateCells: {
      range: { sheetId, startRowIndex: 14, endRowIndex: 15, startColumnIndex: 0, endColumnIndex: 5 },
      fields: "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)",
      rows: [{ values: Array.from({ length: 5 }, () => ({ userEnteredFormat: {
        horizontalAlignment: "LEFT", verticalAlignment: "MIDDLE",
        textFormat: { italic: true, fontSize: 9, foregroundColor: { red: 0.45, green: 0.45, blue: 0.43 }, fontFamily: "Noto Sans Bengali" },
      } })) }],
    } },
    { mergeCells: { range: { sheetId, startRowIndex: 14, endRowIndex: 15, startColumnIndex: 0, endColumnIndex: 5 }, mergeType: "MERGE_ALL" } },
  );
  // Column widths
  SUMMARY_WIDTHS.forEach((w, i) => {
    batch.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: w },
        fields: "pixelSize",
      },
    });
  });
  return batch;
}

async function styleSummaryTab(cfg: SheetsConfig, token: string, sheetId: number): Promise<void> {
  const batch = styleSummaryRequestBatch(sheetId);
  const br = await fetch(`${BASE}/${cfg.spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers(token) },
    body: JSON.stringify({ requests: batch }),
  });
  console.error(`[formatSheets] সারসংক্ষেপ: batchUpdate status ${br.ok ? 200 : br.status}`);
  if (!br.ok) throw new Error(`format সারসংক্ষেপ: ${await br.text()}`);
}

function colLetter(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/**
 * Puts friendly Bengali headers on row 1 and applies the modern template
 * (dark-green header, banded rows, borders, currency format, widths, freeze).
 * Safe to run after every fullSync — idempotent.
 */
export async function formatSheets(cfg: SheetsConfig, token: string): Promise<string[]> {
  const meta = await fetch(`${BASE}/${cfg.spreadsheetId}`, { headers: headers(token) });
  const metaJson = await meta.json();
  const tabs: { id: number; title: string; hasBand: boolean }[] = (metaJson.sheets || []).map((s: any) => ({
    id: s.properties.sheetId,
    title: s.properties.title,
    hasBand: ((s.bandedRanges || []) as any[]).some((b: any) => {
      const r = b.bandedRange?.range ?? b.range;
      if (!r) return false;
      // Banding ranges may omit sheetId (applies to the sheet they belong to).
      const sheetMatch = r.sheetId === s.properties.sheetId || r.sheetId === undefined || r.sheetId === null;
      return sheetMatch && (r.startRowIndex ?? 0) <= 1 && (r.endRowIndex ?? 0) >= 1000;
    }),
  }));

  // 1) Write Bengali display headers (row 1)
  const writePromises: Promise<void>[] = [];
  for (const t of tabs) {
    const cols = HEADER_DISPLAY[t.title];
    if (!cols) continue;
    const range = `${t.title}!A1:${colLetter(cols.length - 1)}1`;
    writePromises.push(
      fetch(`${BASE}/${cfg.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers(token) },
        body: JSON.stringify({ range, majorDimension: "ROWS", values: [cols] }),
      }).then(async (r) => {
        console.error(`[formatSheets] Bengali header PUT ${t.title}: status ${r.status}`);
        if (!r.ok) throw new Error(`write Bengali header ${t.title}: ${await r.text()}`);
      })
    );
    // 2) Style the tab
    const maxCol = cols.length;
    const batch: Record<string, unknown>[] = [
      {
        updateCells: {
          range: { sheetId: t.id, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: maxCol },
          fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)",
          rows: [
            {
              values: Array.from({ length: maxCol }, () => ({
                userEnteredFormat: {
                  backgroundColor: { red: GREEN[0], green: GREEN[1], blue: GREEN[2] },
                  horizontalAlignment: "CENTER",
                  verticalAlignment: "MIDDLE",
                  textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 }, fontFamily: "Noto Sans Bengali" },
                  borders: { bottom: { style: "SOLID_MEDIUM", color: { red: GOLD[0], green: GOLD[1], blue: GOLD[2] } } },
                },
              })),
            },
          ],
        },
      },
      {
        repeatCell: {
          range: { sheetId: t.id, startRowIndex: 1, endRowIndex: 1001, startColumnIndex: 0, endColumnIndex: maxCol },
          cell: { userEnteredFormat: { backgroundColor: { red: CREAM[0], green: CREAM[1], blue: CREAM[2] } } },
          fields: "userEnteredFormat.backgroundColor",
        },
      },
      ...(t.hasBand
        ? []
        : [
            {
              addBanding: {
                bandedRange: {
                  range: { sheetId: t.id, startRowIndex: 1, endRowIndex: 1001, startColumnIndex: 0, endColumnIndex: maxCol },
                  rowProperties: {
                    firstBandColor: { red: MIST[0], green: MIST[1], blue: MIST[2] },
                    secondBandColor: { red: CREAM[0], green: CREAM[1], blue: CREAM[2] },
                  },
                },
              },
            },
          ]),
      {
        repeatCell: {
          range: { sheetId: t.id, startRowIndex: 1, endRowIndex: 1001, startColumnIndex: AMOUNT_COL[t.title], endColumnIndex: AMOUNT_COL[t.title] + 1 },
          cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: "৳#,##0.00" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      {
        updateBorders: {
          range: { sheetId: t.id, startRowIndex: 0, endRowIndex: 1001, startColumnIndex: 0, endColumnIndex: maxCol },
          top: { style: "SOLID", color: { red: GRID[0], green: GRID[1], blue: GRID[2] } },
          bottom: { style: "SOLID", color: { red: GRID[0], green: GRID[1], blue: GRID[2] } },
          left: { style: "SOLID", color: { red: GRID[0], green: GRID[1], blue: GRID[2] } },
          right: { style: "SOLID", color: { red: GRID[0], green: GRID[1], blue: GRID[2] } },
          innerHorizontal: { style: "DOTTED", color: { red: 0.87, green: 0.87, blue: 0.84 } },
          innerVertical: { style: "SOLID", color: { red: GRID[0], green: GRID[1], blue: GRID[2] } },
        },
      },
    ];
    (COL_WIDTHS[t.title] || []).forEach((w, i) => {
      batch.push({
        updateDimensionProperties: {
          range: { sheetId: t.id, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
          properties: { pixelSize: w },
          fields: "pixelSize",
        },
      });
    });
    batch.push(
      {
        updateSheetProperties: {
          properties: { sheetId: t.id, gridProperties: { frozenRowCount: 1 } },
          fields: "gridProperties.frozenRowCount",
        },
      },
      {
        updateDimensionProperties: {
          range: { sheetId: t.id, dimension: "ROWS", startIndex: 0, endIndex: 1 },
          properties: { pixelSize: 30 },
          fields: "pixelSize",
        },
      }
    );
    const br = await fetch(`${BASE}/${cfg.spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers(token) },
      body: JSON.stringify({ requests: batch }),
    });
    console.error(`[formatSheets] ${t.title}: batchUpdate status ${br.ok ? 200 : br.status}`);
    if (!br.ok) throw new Error(`format ${t.title}: ${await br.text()}`);
  }
  await Promise.all(writePromises);

  // Verification pass — ensure the friendly display headers really landed.
  const verify: Promise<void>[] = [];
  for (const t of tabs) {
    const cols = HEADER_DISPLAY[t.title];
    if (!cols) continue;
    const range = `${t.title}!A1:${colLetter(cols.length - 1)}1`;
    verify.push(
      fetch(`${BASE}/${cfg.spreadsheetId}/values/${encodeURIComponent(range)}`, { headers: headers(token) })
        .then(async (r) => {
          const d = await r.json();
          const got = d.values?.[0] || [];
          const ok = cols.every((c, i) => String(got[i] ?? "") === c);
          if (!ok) throw new Error(`display header verify failed for ${t.title}: got ${JSON.stringify(got).slice(0, 200)}`);
        })
    );
  }
  await Promise.all(verify);

  // 3) Style the সারসংক্ষেপ (summary dashboard) tab if present
  const summaryTab = tabs.find((t) => t.title === "সারসংক্ষেপ");
  if (summaryTab) {
    await styleSummaryTab(cfg, token, summaryTab.id);
  }

  return tabs.map((t) => t.title).filter((t) => HEADER_DISPLAY[t] || t === "সারসংক্ষেপ");
}
