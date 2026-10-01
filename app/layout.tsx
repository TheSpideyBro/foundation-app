import type { Metadata, Viewport } from "next";
import { Tiro_Bangla, Hind_Siliguri, Baloo_Da_2, Galada, Anek_Bangla } from "next/font/google";
import localFont from "next/font/local";
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

const balooDa2 = Baloo_Da_2({
  weight: ["500", "600", "700", "800"],
  subsets: ["bengali"],
  variable: "--font-baloo",
  display: "swap",
});

const galada = Galada({
  weight: "400",
  subsets: ["bengali"],
  variable: "--font-galada",
  display: "swap",
});

const anekBangla = Anek_Bangla({
  weight: ["400", "500", "600", "700"],
  subsets: ["bengali"],
  variable: "--font-anek",
  display: "swap",
});

// Lipighor "Li Sabbir Sorolota" — custom Bengali display font supplied by Akash,
// used for the receipt masthead. See app/fonts/ (Unicode TTFs only; ANSI variants not for web use).
const sabbirSorolota = localFont({
  src: [
    {
      path: "./fonts/LiSabbirSorolotaUnicode-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/LiSabbirSorolotaUnicode-Italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-sabbir",
  display: "swap",
});

// Lipighor "Li Alinur Nakkhatra" — custom Bengali font supplied by Akash,
// used for the receipt detail rows (replaces Anek Bangla). See app/fonts/
// (Unicode TTFs only; ANSI variants not for web use).
const alinurNakkhatra = localFont({
  src: [
    {
      path: "./fonts/LiAlinurNakkhatraUnicode-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/LiAlinurNakkhatraUnicode-Italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-nakkhatra",
  display: "swap",
});

// Lipighor "Li Abu J M Akkas" — custom Bengali font supplied by Akash,
// now the default body font (replaces Hind Siliguri). See app/fonts/
// (Unicode TTFs only; ANSI variants not for web use).
const abuJmAkkas = localFont({
  src: [
    {
      path: "./fonts/LiAbuJMAkkasUnicode-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/LiAbuJMAkkasUnicode-Italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-akkas",
  display: "swap",
});

// Lipighor "Li Shadhinata 2.0" — custom Bengali font supplied by Akash,
// used for the receipt masthead (replaces Sabbir Sorolota). See app/fonts/
// (Unicode TTFs only; ANSI variants not for web use).
const shadhinata = localFont({
  src: [
    {
      path: "./fonts/LiShadhinata2Unicode-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/LiShadhinata2Unicode-Italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-shadhinata",
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
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={`${tiroBangla.variable} ${hindSiliguri.variable} ${balooDa2.variable} ${galada.variable} ${anekBangla.variable} ${sabbirSorolota.variable} ${alinurNakkhatra.variable} ${abuJmAkkas.variable} ${shadhinata.variable}`}>
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
