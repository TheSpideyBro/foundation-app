import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // @sparticuz/chromium resolves its binary via a path relative to the
  // package — bundling/relocating it breaks executablePath() at runtime
  // (see its README "Bundler Configuration"). Keep it external.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  images: {
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // NOTE: script-src keeps 'unsafe-inline' — Next.js App Router inlines
          // bootstrap/hydration scripts, and static next.config headers cannot
          // mint per-request nonces. A nonce-based policy would need middleware.
          // QR codes are generated server-side (no api.qrserver.com call), and
          // fonts are self-hosted via next/font, so those sources are omitted.
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
