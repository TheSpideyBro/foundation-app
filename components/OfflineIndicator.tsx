"use client";

import { useEffect, useState } from "react";
import { getUnsyncedCount, syncNow, initSyncEngine, notifyQueueChanged } from "@/lib/sync-engine";
import { listOps, deleteOp, type QueuedOp } from "@/lib/offline-queue";

/**
 * F2: offline status pill + pending-sync queue UI.
 *
 * - Green "অনলাইন" when connected, amber "অফলাইন" when not.
 * - Badge with the number of queued (unsynced) operations.
 * - Tap to expand: list queued ops, "এখনই সিঙ্ক করুন" button, discard.
 */
export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [open, setOpen] = useState(false);
  const [ops, setOps] = useState<QueuedOp[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = async () => {
    setOnline(navigator.onLine);
    setPending(await getUnsyncedCount());
    if (open) setOps(await listOps(["pending", "failed", "syncing"]));
  };

  useEffect(() => {
    initSyncEngine();
    refresh();
    const onStatus = () => refresh();
    const onQueue = () => refresh();
    window.addEventListener("online", onStatus);
    window.addEventListener("offline", onStatus);
    window.addEventListener("offline-queue-changed", onQueue);
    const t = window.setInterval(refresh, 10000);
    return () => {
      window.removeEventListener("online", onStatus);
      window.removeEventListener("offline", onStatus);
      window.removeEventListener("offline-queue-changed", onQueue);
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const doSync = async () => {
    setSyncing(true);
    await syncNow();
    await refresh();
    setSyncing(false);
  };

  const discard = async (id: number) => {
    await deleteOp(id);
    notifyQueueChanged();
    await refresh();
  };

  // Hide when everything is fine and online — zero noise.
  if (online && pending === 0 && !open) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 rounded-2xl border border-emerald-900/10 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-emerald-950">অপেক্ষমাণ সিঙ্ক</p>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-emerald-700 underline"
            >
              বন্ধ করুন
            </button>
          </div>
          {ops.length === 0 ? (
            <p className="text-xs text-emerald-800/70">সব সিঙ্ক হয়ে গেছে ✓</p>
          ) : (
            <ul className="mb-2 max-h-48 space-y-1 overflow-y-auto">
              {ops.map((op) => (
                <li
                  key={op.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-emerald-950">
                    {op.label}
                    {op.status === "failed" && op.lastError && (
                      <span className="block truncate text-red-600">
                        {op.lastError}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => op.id !== undefined && discard(op.id)}
                    className="shrink-0 text-red-600 underline"
                  >
                    বাদ দিন
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={doSync}
            disabled={syncing || !online}
            className="w-full rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {syncing ? "সিঙ্ক হচ্ছে..." : "এখনই সিঙ্ক করুন"}
          </button>
          {!online && (
            <p className="mt-1 text-center text-xs text-amber-700">
              ইন্টারনেট নেই — সংযোগ ফিরলে স্বয়ংক্রিয়ভাবে পাঠানো হবে
            </p>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold shadow-lg ${
          online
            ? "bg-emerald-700 text-white"
            : "bg-amber-500 text-white"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${online ? "bg-emerald-200" : "bg-white animate-pulse"}`}
        />
        {online ? "অনলাইন" : "অফলাইন"}
        {pending > 0 && (
          <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[11px]">
            {pending}
          </span>
        )}
      </button>
    </div>
  );
}
