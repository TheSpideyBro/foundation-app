import { NextResponse } from "next/server";
import { createClient as createSupaClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/server-auth";
import { toBengaliNumber } from "@/lib/utils";

/** Service-role client for RPCs the cookie-scoped client cannot call
 * (backfill_payment_allocations is EXECUTE-restricted to service_role). */
function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey =
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createSupaClient(supabaseUrl, supabaseServiceKey);
}

/**
 * GET  /api/admin/bulk?type=members|donations|expenses[&limit=&offset=] — export rows
 * POST /api/admin/bulk                                                   — bulk import
 *
 * `type` is user input: it must be allow-listed or an admin session could
 * read or write ANY table (users, auth-adjacent tables included).
 *
 * POST is fail-closed: every row is validated against the per-table column
 * allow-list + type rules below. If ANY row fails, nothing is inserted and
 * the response carries per-row errors ({ row, error }) with Bangla messages.
 */
const ALLOWED_TABLES = new Set(["members", "donations", "expenses"]);
const EXPORT_SELECT: Record<string, string> = {
  members: "*",
  donations: "*, members(name)",
  expenses: "*",
};

const MAX_IMPORT_ROWS = 500;
const MAX_ROW_ERRORS = 50;

const DEFAULT_EXPORT_LIMIT = 1000;
const MAX_EXPORT_LIMIT = 5000;

type ColType = "string" | "number" | "date" | "month";

type ColumnRules = {
  allowed: string[];
  required: string[];
  types: Record<string, ColType>;
  positive?: string[];
  nonNegative?: string[];
  oneOf?: Record<string, string[]>;
};

const COLUMN_RULES: Record<string, ColumnRules> = {
  members: {
    allowed: ["name", "phone", "address", "join_date", "monthly_pledge", "status"],
    required: ["name"],
    types: {
      name: "string",
      phone: "string",
      address: "string",
      join_date: "date",
      monthly_pledge: "number",
      status: "string",
    },
    nonNegative: ["monthly_pledge"],
  },
  donations: {
    allowed: [
      "member_id", "amount", "date", "method", "receipt_no", "donation_month",
      "received_by", "collected_by", "extra_amount", "note",
      "coverage_start_month", "coverage_end_month", "donation_end_month",
    ],
    required: ["member_id", "amount", "receipt_no"],
    types: {
      member_id: "string",
      amount: "number",
      date: "date",
      method: "string",
      receipt_no: "string",
      donation_month: "month",
      received_by: "string",
      collected_by: "string",
      extra_amount: "number",
      note: "string",
      coverage_start_month: "month",
      coverage_end_month: "month",
      donation_end_month: "month",
    },
    positive: ["amount"],
    nonNegative: ["extra_amount"],
    oneOf: { method: ["cash", "bkash", "nagad", "bank"] },
  },
  expenses: {
    allowed: ["category", "amount", "date", "description", "proof_url"],
    required: ["category", "amount"],
    types: {
      category: "string",
      amount: "number",
      date: "date",
      description: "string",
      proof_url: "string",
    },
    positive: ["amount"],
  },
};

const COLUMN_LABELS: Record<string, string> = {
  name: "নাম",
  phone: "ফোন",
  address: "ঠিকানা",
  join_date: "যোগদানের তারিখ",
  monthly_pledge: "মাসিক প্রতিশ্রুতি",
  status: "অবস্থা",
  member_id: "সদস্য আইডি",
  amount: "পরিমাণ",
  date: "তারিখ",
  method: "পদ্ধতি",
  receipt_no: "রসিদ নম্বর",
  donation_month: "অনুদানের মাস",
  donation_end_month: "অনুদান শেষের মাস",
  received_by: "গ্রহণকারী",
  collected_by: "আদায়কারী",
  extra_amount: "অতিরিক্ত পরিমাণ",
  note: "নোট",
  coverage_start_month: "কভারেজ শুরুর মাস",
  coverage_end_month: "কভারেজ শেষের মাস",
  category: "বিভাগ",
  description: "বিবরণ",
  proof_url: "প্রমাণ লিংক",
};

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const labelOf = (col: string) => COLUMN_LABELS[col] ?? col;

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/** Excel serial date number → YYYY-MM-DD. */
function serialToISODate(serial: number): string | null {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function coerceCell(col: string, type: ColType, raw: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  const label = labelOf(col);
  if (type === "string") {
    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
      return { ok: true, value: String(raw) };
    }
    return { ok: false, error: `${label} (${col}) টেক্সট হতে হবে` };
  }
  if (type === "number") {
    const n = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (!Number.isFinite(n)) return { ok: false, error: `${label} (${col}) একটি সংখ্যা হতে হবে` };
    return { ok: true, value: n };
  }
  if (type === "date") {
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      const p = (n: number) => String(n).padStart(2, "0");
      return { ok: true, value: `${raw.getFullYear()}-${p(raw.getMonth() + 1)}-${p(raw.getDate())}` };
    }
    if (typeof raw === "number") {
      const iso = serialToISODate(raw);
      if (iso) return { ok: true, value: iso };
      return { ok: false, error: `${label} (${col}) তারিখ হতে হবে (YYYY-MM-DD)` };
    }
    const s = String(raw).trim();
    if (DATE_RE.test(s)) return { ok: true, value: s };
    return { ok: false, error: `${label} (${col}) তারিখ হতে হবে (YYYY-MM-DD)` };
  }
  // "month"
  const s = String(raw).trim();
  if (MONTH_RE.test(s)) return { ok: true, value: s };
  return { ok: false, error: `${label} (${col}) মাস হতে হবে (YYYY-MM)` };
}

/**
 * Validate one row against the table's allow-list. Returns the sanitized
 * row (unknown columns stripped is NOT done — unknown columns fail, so the
 * API never silently writes a column the template didn't promise) plus a
 * list of Bangla error messages.
 */
function validateRow(
  rules: ColumnRules,
  row: Record<string, unknown>
): { sanitized: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(row)) {
    if (!rules.allowed.includes(key)) {
      errors.push(`অজানা কলাম "${key}" — টেমপ্লেটের হেডার ব্যবহার করুন`);
    }
  }
  if (errors.length > 0) return { sanitized, errors };

  for (const col of rules.required) {
    if (isEmpty(row[col])) errors.push(`${labelOf(col)} (${col}) আবশ্যক`);
  }

  for (const col of rules.allowed) {
    if (isEmpty(row[col])) continue;
    const coerced = coerceCell(col, rules.types[col], row[col]);
    if (!coerced.ok) {
      errors.push(coerced.error);
      continue;
    }
    sanitized[col] = coerced.value;
  }

  for (const col of rules.positive ?? []) {
    const v = sanitized[col];
    if (v !== undefined && !(typeof v === "number" && v > 0)) {
      errors.push(`${labelOf(col)} (${col}) শূন্যের বেশি হতে হবে`);
    }
  }
  for (const col of rules.nonNegative ?? []) {
    const v = sanitized[col];
    if (v !== undefined && !(typeof v === "number" && v >= 0)) {
      errors.push(`${labelOf(col)} (${col}) শূন্য বা তার বেশি হতে হবে`);
    }
  }
  for (const [col, allowed] of Object.entries(rules.oneOf ?? {})) {
    const v = sanitized[col];
    if (v !== undefined && !allowed.includes(String(v))) {
      errors.push(`${labelOf(col)} (${col}) "${v}" গ্রহণযোগ্য নয়`);
    }
  }

  return { sanitized, errors };
}

function resolveTable(type: unknown): string | null {
  return typeof type === "string" && ALLOWED_TABLES.has(type) ? type : null;
}

function parseBoundedInt(raw: string | null, fallback: number, max: number): number {
  const n = raw === null ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.floor(n), max);
}

export async function GET(request: Request) {
  const auth = await requireAuth("admin");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const table = resolveTable(searchParams.get("type")); // members | donations | expenses
  if (!table) {
    return NextResponse.json(
      { error: `Invalid type — allowed: ${[...ALLOWED_TABLES].join(", ")}` },
      { status: 400 }
    );
  }

  // Unbounded select("*") could dump the whole table into one response;
  // paginate instead (default 1000, hard max 5000).
  const limit = parseBoundedInt(searchParams.get("limit"), DEFAULT_EXPORT_LIMIT, MAX_EXPORT_LIMIT);
  const offset = parseBoundedInt(searchParams.get("offset"), 0, Number.MAX_SAFE_INTEGER);

  try {
    const { data, error } = await auth.supabase
      .from(table)
      .select(EXPORT_SELECT[table])
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "এক্সপোর্ট করতে সমস্যা হয়েছে" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth("admin");
  if (!auth.ok) return auth.response;

  try {
    const { type, items } = await request.json();
    const table = resolveTable(type);
    if (!table) {
      return NextResponse.json(
        { error: `Invalid type — allowed: ${[...ALLOWED_TABLES].join(", ")}` },
        { status: 400 }
      );
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "ইম্পোর্ট করার মতো কোনো সারি পাওয়া যায়নি" }, { status: 400 });
    }
    if (items.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `একবারে সর্বোচ্চ ${toBengaliNumber(MAX_IMPORT_ROWS)} সারি ইম্পোর্ট করা যাবে` },
        { status: 413 }
      );
    }

    const rules = COLUMN_RULES[table];
    const rowErrors: { row: number; error: string }[] = [];
    const sanitized: Record<string, unknown>[] = [];

    items.forEach((rawItem: unknown, i: number) => {
      // +2: header row + 1-based indexing → the row number in the spreadsheet.
      const rowNum = i + 2;
      if (typeof rawItem !== "object" || rawItem === null || Array.isArray(rawItem)) {
        rowErrors.push({ row: rowNum, error: "সারিটি পড়া যায়নি" });
        return;
      }
      const { sanitized: clean, errors } = validateRow(rules, rawItem as Record<string, unknown>);
      for (const error of errors) {
        if (rowErrors.length < MAX_ROW_ERRORS) rowErrors.push({ row: rowNum, error });
      }
      if (errors.length === 0) sanitized.push(clean);
    });

    if (rowErrors.length > 0) {
      return NextResponse.json(
        {
          error: `${toBengaliNumber(rowErrors.length)}টি সারিতে ত্রুটি পাওয়া গেছে — কোনো তথ্য ইম্পোর্ট হয়নি`,
          rowErrors,
        },
        { status: 400 }
      );
    }

    const { error } = await auth.supabase.from(table).insert(sanitized);
    if (error) throw error;

    // S-L1: bulk-inserted donations bypass save_payment_entry, so they have no
    // payment_allocations rows — the SUM(payment_allocations)=SUM(donations)
    // invariant breaks until backfilled. backfill_payment_allocations() only
    // touches donations with no allocations (idempotent) and is
    // service_role-only, so it runs here via the service client, still behind
    // the admin gate above. A backfill failure must not roll back the import
    // (rows are already committed) — it is surfaced as a warning instead.
    let backfillWarning: string | null = null;
    if (table === "donations") {
      const svc = serviceClient();
      if (!svc) {
        backfillWarning = "সার্ভিস কী কনফিগার করা নেই — allocation backfill চালানো যায়নি, পরে চালান";
      } else {
        const { error: backfillError } = await svc.rpc("backfill_payment_allocations");
        if (backfillError) {
          backfillWarning = `ইম্পোর্ট সম্পন্ন, কিন্তু allocation backfill ব্যর্থ: ${backfillError.message}`;
        }
      }
    }

    return NextResponse.json({ success: true, count: sanitized.length, backfillWarning });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ইম্পোর্ট করতে সমস্যা হয়েছে" },
      { status: 500 }
    );
  }
}
