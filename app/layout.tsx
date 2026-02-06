import type React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { Be_Vietnam_Pro } from "next/font/google";
import { APP_CONFIG } from "@/lib/app-config";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({ 
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-family"
});

const appName = APP_CONFIG.NAME;
const appDescription = APP_CONFIG.DESCRIPTION;

export const metadata: Metadata = {
  title: "Made with App Studio",
  description: appDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: "Made with App Studio",
    description: appDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Made with App Studio",
    description: appDescription,
  },
    generator: 'v0.app'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" style={{ fontFamily: beVietnamPro.style.fontFamily }} className="w-full max-w-full overflow-x-hidden">
      <head>
        {/* Load Pi SDK as early as possible. Pi Browser sometimes fails to attach window.Pi when the SDK is injected late. */}
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
      </head>
      <body className={`${beVietnamPro.className} w-full max-w-full overflow-x-hidden`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
