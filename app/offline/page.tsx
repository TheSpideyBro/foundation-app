"use client";

/**
 * Offline fallback page (U-M5). Served by the service worker when a
 * navigation request fails with no network. Uses inline styles only —
 * no Tailwind/JS chunks are guaranteed to be cached, so this page must
 * render legibly with zero additional assets.
 */
export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#FDFCF7",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 340 }}>
        <p style={{ fontSize: 48, margin: "0 0 12px" }}>📡</p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
          ইন্টারনেট সংযোগ নেই
        </h1>
        <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 24px", lineHeight: 1.6 }}>
          সংযোগ ফিরে এলে নিচের বোতাম চাপুন — পেজটি আবার লোড হবে।
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            background: "#047857",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 28px",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    </div>
  );
}
