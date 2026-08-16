/**
 * On-mutation Google Sheets auto-sync (client-side hook helper).
 *
 * Called fire-and-forget after any member/donation/expense
 * insert, update or delete succeeds. Never blocks the UI and never
 * shows errors to the user — failures are silently retried by the
 * next mutation or by the admin "এখনই Sync" button.
 *
 * Throttle: max one request per 10 seconds to avoid spamming the API.
 */

let lastSync = 0;
let inFlight = false;

export function triggerSheetsSync() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastSync < 10_000 || inFlight) return;
  lastSync = now;
  inFlight = true;
  fetch("/api/sync-sheets", { method: "POST" })
    .then((r) => r.json())
    .then((j) => {
      if (j.ok && j.syncedAt) {
        const at = new Date(j.syncedAt).toLocaleString("bn-BD");
        localStorage.setItem("sheets_last_sync", at);
        localStorage.setItem("sheets_counts", JSON.stringify(j.sheets || null));
      }
    })
    .catch(() => {
      /* silent — admin can force-sync anytime */
    })
    .finally(() => {
      inFlight = false;
    });
}
