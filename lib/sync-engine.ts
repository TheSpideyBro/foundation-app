/**
 * F2 offline-first sync: replay engine.
 *
 * Drains the IndexedDB outbox FIFO when the browser is online:
 *  - `payment.create` → POST /api/payments
 *
 * Conflict policy: receipt_no is unique server-side. If a replay hits
 * `duplicate_receipt`, the payment almost certainly committed on an
 * earlier attempt (timeout after write) — mark it synced instead of
 * retrying forever.
 *
 * Runs on: app start, `online` event, and manual "sync now".
 * Emits CustomEvents so UI can refresh: `offline-queue-changed`.
 */

import {
  listOps,
  setOpStatus,
  countUnsynced,
  type QueuedOp,
} from "./offline-queue";

const MAX_ATTEMPTS = 10;

export function notifyQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("offline-queue-changed"));
  }
}

async function replayPayment(op: QueuedOp): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(op.payload as object), notify: false }),
    });
    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    if (res.ok) return { ok: true };
    const raw = String((data as Record<string, unknown>).error || "");
    const code = String((data as Record<string, unknown>).code || "");
    if (code === "duplicate_receipt" || /duplicate key|receipt_no/i.test(raw)) {
      // Already committed on the server (likely a timeout-after-write).
      return { ok: true, duplicate: true };
    }
    return { ok: false, error: raw || `HTTP ${res.status}` };
  } catch (e) {
    // Network failure — stay queued for the next run.
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

let running = false;

/** Process all pending ops FIFO. Safe to call concurrently (guarded). */
export async function syncNow(): Promise<{ synced: number; failed: number }> {
  if (running) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }
  running = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = await listOps(["pending", "failed"]);
    for (const op of pending) {
      if (op.id === undefined) continue;
      if (op.attempts >= MAX_ATTEMPTS) continue;
      await setOpStatus(op.id, "syncing");
      notifyQueueChanged();

      let result: { ok: boolean; duplicate?: boolean; error?: string };
      if (op.type === "payment.create") {
        result = await replayPayment(op);
      } else {
        result = { ok: false, error: `Unknown op type: ${op.type}` };
      }

      if (result.ok) {
        await setOpStatus(op.id, "synced");
        synced++;
      } else {
        // Network errors keep it pending (attempts not bumped for retry);
        // application errors mark failed (attempts bumped).
        const isNetwork = /network|fetch|failed to fetch|abort/i.test(result.error || "");
        await setOpStatus(op.id, isNetwork ? "pending" : "failed", result.error);
        if (!isNetwork) failed++;
      }
      notifyQueueChanged();
    }
  } finally {
    running = false;
  }
  return { synced, failed };
}

/** Current unsynced count for badges. */
export async function getUnsyncedCount(): Promise<number> {
  try {
    return await countUnsynced();
  } catch {
    return 0;
  }
}

let initialized = false;

/** Wire up automatic sync triggers. Call once from a client component. */
export function initSyncEngine() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const kick = () => {
    // Small delay lets the network actually come up.
    window.setTimeout(() => void syncNow(), 1500);
  };

  window.addEventListener("online", kick);
  // Sync on start (covers the "was offline, app reopened" case).
  if (navigator.onLine) kick();
  // Periodic safety net every 5 minutes while the app is open.
  window.setInterval(() => {
    if (navigator.onLine) void syncNow();
  }, 5 * 60 * 1000);
}
