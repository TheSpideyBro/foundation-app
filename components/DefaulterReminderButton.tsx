"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { monthLabelBengali } from "@/lib/utils";

/**
 * F5 — per-defaulter manual pledge reminder button.
 * Extracted as its own component so the analytics page's manual
 * useMemo blocks stay compilable (react-hooks/preserve-manual-memoization).
 */
export default function DefaulterReminderButton({
  memberId,
  month,
  alreadySent,
  onSent,
}: {
  memberId: string;
  /** YYYY-MM the reminder is about. */
  month: string;
  alreadySent: boolean;
  onSent: (memberId: string, status: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/notify/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, month }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "পাঠানো যায়নি");
      onSent(memberId, data.status || "sent");
      if (data.status === "skipped") {
        window.alert(`এড়িয়ে যাওয়া হয়েছে: ${data.detail || ""}`);
      }
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "রিমাইন্ডার পাঠানো যায়নি"
      );
    } finally {
      setBusy(false);
    }
  }

  if (alreadySent) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded-lg"
        title={`${monthLabelBengali(month)}-এর রিমাইন্ডার পাঠানো হয়েছে`}
      >
        ✓ পাঠানো
      </span>
    );
  }

  return (
    <button
      onClick={() => void handleClick()}
      disabled={busy}
      className="p-2.5 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl bg-amber-50 text-amber-700 disabled:opacity-50"
      title={`${monthLabelBengali(month)}-এর বকেয়ার রিমাইন্ডার পাঠান`}
      aria-label="রিমাইন্ডার পাঠান"
    >
      {busy ? (
        <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <BellRing size={16} />
      )}
    </button>
  );
}
