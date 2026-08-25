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
  metadataBase: new URL("https://daulkharfoundation.vercel.app"),
  title: {
    default: "দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন",
    template: "%s | দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন",
  },
  description: "২০০৯ সাল থেকে স্বচ্ছতা ও আস্থার সাথে আর্তমানবতার সেবায় নিয়োজিত একটি অলাভজনক সমাজসেবামূলক প্রতিষ্ঠান।",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন",
  },
  authors: [{ name: "Saddam Hossain Akash" }],
  openGraph: {
    type: "website",
    locale: "bn_BD",
    url: "https://daulkharfoundation.vercel.app",
    title: "দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন",
    description: "২০০৯ সাল থেকে স্বচ্ছতা ও আস্থার সাথে আর্তমানবতার সেবায় নিয়োজিত একটি অলাভজনক সমাজসেবামূলক প্রতিষ্ঠান।",
    siteName: "দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন লোগো",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন",
    description: "২০০৯ সাল থেকে স্বচ্ছতা ও আস্থার সাথে আর্তমানবতার সেবায় নিয়োজিত একটি অলাভজনক সমাজসেবামূলক প্রতিষ্ঠান।",
    images: ["/icons/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
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
