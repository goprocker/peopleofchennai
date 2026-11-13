import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif, Noto_Sans_Tamil } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil"],
  display: "swap",
  preload: false,
});

const description =
  "Stories of the people who make Chennai — artists, founders, students, shopkeepers and everyday heroes, told with consent.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "People of Chennai", template: "%s · People of Chennai" },
  description,
  openGraph: { type: "website", siteName: "People of Chennai", locale: "en_IN", description },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#f5f0e7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${instrumentSerif.variable} ${dmSans.variable} ${notoTamil.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only z-[60] rounded-full px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {/* Each route group (site, admin) renders its own chrome and a <main id="main">. */}
        {children}
      </body>
    </html>
  );
}
