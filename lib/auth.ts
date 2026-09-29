/**
 * Canonical role / permission helpers.
 *
 * Every role check in this app — UI gates and API routes — must come from
 * here so there is exactly one definition of "admin" and "staff" (TD-001).
 * Never inline a role comparison or an email literal in a component again.
 *
 * Precedence: users.role first, then the (single, env-overridable) founder
 * bypass. Delete FOUNDER_EMAIL once the founder's users.role is verified to
 * be 'admin' in the live database — see docs/decisions/TECH_DEBT.md TD-001.
 */

export type AppRole = "admin" | "treasurer" | "member";

/** Single source of the founder bypass email (TD-001). */
export const FOUNDER_EMAIL = (
  process.env.NEXT_PUBLIC_FOUNDER_EMAIL ?? "saddamakash234@gmail.com"
).toLowerCase();

export function isFounder(email?: string | null): boolean {
  return Boolean(email) && email!.trim().toLowerCase() === FOUNDER_EMAIL;
}

/** admin or treasurer — may enter payments, view staff data. */
export function isStaff(role?: string | null, email?: string | null): boolean {
  return role === "admin" || role === "treasurer" || isFounder(email);
}

/** admin only — may manage users, roles, schema-affecting tools. */
export function isAdmin(role?: string | null, email?: string | null): boolean {
  return role === "admin" || isFounder(email);
}

/**
 * Account approval gate. Only an explicit `true` passes.
 *
 * users.is_approved is NOT NULL DEFAULT false in the live schema (see
 * supabase/schema.sql), so NULL means "never read / unknown" and must fail
 * closed rather than open.
 */
export function isApproved(isApproved?: boolean | null): boolean {
  return isApproved === true;
}
