import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isApproved, isStaff } from "@/lib/auth";

/**
 * Canonical server-side authorization for /api routes.
 *
 * Every API route must call this before touching data. It reads the session
 * from the @supabase/ssr cookie (never parse the cookie by hand — see
 * BUG-011), resolves the caller's role from public.users, enforces account
 * approval, and applies the requested permission level.
 *
 *   const auth = await requireAuth("staff");   // "staff" | "admin"
 *   if (!auth.ok) return auth.response;
 *   // auth.supabase — cookie-scoped client (RLS applies)
 *   // auth.userId, auth.role, auth.email
 */

export type AuthLevel = "staff" | "admin";

export type AuthSuccess = {
  ok: true;
  supabase: ReturnType<typeof createClient>;
  userId: string;
  role: string | null;
  email: string | null;
};

export type AuthFailure = { ok: false; response: NextResponse };

export type AuthResult = AuthSuccess | AuthFailure;

const deny = (status: number, error: string): AuthFailure => ({
  ok: false,
  response: NextResponse.json({ error }, { status }),
});

export async function requireAuth(level: AuthLevel): Promise<AuthResult> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return deny(401, "Unauthorized");

  const { data: row } = await supabase
    .from("users")
    .select("role, is_approved")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!isApproved(row?.is_approved)) {
    return deny(403, "Account not approved");
  }

  const role = row?.role ?? null;
  const email = session.user.email ?? null;

  const allowed = level === "admin" ? isAdmin(role) : isStaff(role);
  if (!allowed) return deny(403, level === "admin" ? "Admins only" : "Only staff can do this");

  return { ok: true, supabase, userId: session.user.id, role, email };
}
