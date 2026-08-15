import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/providers";

export const metadata: Metadata = {
  title: "দৌলখাড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন — হিসাব খাতা",
  description: "দৌলখাড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশনের তহবিল ব্যবস্থাপনা অ্যাপ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "হিলফুল ফাউন্ডেশন",
    statusBarStyle: "black-translucent",
  },
  themeColor: "#1B4332",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Tiro+Bangla&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
            });
          }`}
        </Script>
      </body>
    </html>
  );
}
