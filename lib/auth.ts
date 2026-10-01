/**
 * Canonical role / permission helpers.
 *
 * Every role check in this app — UI gates and API routes — must come from
 * here so there is exactly one definition of "admin" and "staff". Never
 * inline a role comparison in a component again.
 *
 * Roles are the SOLE authority: `users.role` in the database. There is no
 * email-based founder bypass (removed 2026-10-01): a founder keeps admin
 * access only when `users.role = 'admin'`. An account whose role is not
 * set correctly WILL be locked out of admin screens and API routes.
 */

export type AppRole = "admin" | "treasurer" | "member";

/** admin or treasurer — may enter payments, view staff data. */
export function isStaff(role?: string | null): boolean {
  return role === "admin" || role === "treasurer";
}

/** admin only — may manage users, roles, schema-affecting tools. */
export function isAdmin(role?: string | null): boolean {
  return role === "admin";
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
