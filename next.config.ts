import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for optimal Vercel deployment
  output: "standalone",

  // Image optimization for production
  images: {
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
  },

  // Security headers for production
  async headers() {
    return [
      // The service worker must never be cached — always revalidate on every visit
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
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co https://api.qrserver.com;",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // React strict mode is already enabled by default in Next.js 15+
  // Disable React strict mode for production to avoid double-invocation in dev
  reactStrictMode: true,
};

export default nextConfig;
