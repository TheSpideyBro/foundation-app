/**
 * Audit log helper — records important actions (add/edit/delete on members,
 * donations, expenses) to the `audit_log` table via the SECURITY DEFINER
 * function `log_audit_event()`.
 *
 * Migration-resilient: if the migration hasn't been applied yet (function
 * missing), the call fails silently with a console warning so the app keeps
 * working until the admin runs migration-phase2.sql.
 */

import { getSupabase as supabase } from "@/lib/supabase-client";

export async function logAudit(
  action: string,
  targetTable: string,
  targetId?: string | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { error } = await supabase().rpc("log_audit_event", {
      p_action: action,
      p_target_table: targetTable,
      p_target_id: targetId ?? null,
      p_details: details,
    });
    if (error) {
      // Most common: function doesn't exist yet (migration not applied)
      console.warn("[audit] log failed (safe to ignore before migration-phase2.sql):", error.message);
    }
  } catch (e) {
    console.warn("[audit] log failed silently:", e);
  }
}
