import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";

/**
 * GET  /api/admin/bulk?type=members|donations|expenses  — export rows
 * POST /api/admin/bulk                                   — bulk import
 *
 * `type` is user input: it must be allow-listed or an admin session could
 * read or write ANY table (users, auth-adjacent tables included).
 */
const ALLOWED_TABLES = new Set(["members", "donations", "expenses"]);
const EXPORT_SELECT: Record<string, string> = {
  members: "*",
  donations: "*, members(name)",
  expenses: "*",
};

function resolveTable(type: unknown): string | null {
  return typeof type === "string" && ALLOWED_TABLES.has(type) ? type : null;
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

  try {
    const { data, error } = await auth.supabase.from(table).select(EXPORT_SELECT[table]);
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const { error } = await auth.supabase.from(table).insert(items);
    if (error) throw error;

    return NextResponse.json({ success: true, count: items.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
