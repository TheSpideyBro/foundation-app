import type { Metadata, Viewport } from "next";
import { Tiro_Bangla, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers";
import Script from "next/script";
import LayoutWrapper from "./layout-wrapper";

const tiroBangla = Tiro_Bangla({
  weight: "400",
  subsets: ["bengali"],
  variable: "--font-tiro",
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["bengali"],
  variable: "--font-hind",
  display: "swap",
});

export const metadata: Metadata = {
  title: "দৌলখার ফাউন্ডেশন",
  description: "একটি অলাভজনক সমাজসেবামূলক প্রতিষ্ঠান",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "দৌলখার ফাউন্ডেশন",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={`${tiroBangla.variable} ${hindSiliguri.variable}`}>
      <body className="antialiased font-hind">
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful');
                  registration.update();
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
