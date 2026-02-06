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
  // Provide runtime public env for Pi Studio / environments where NEXT_PUBLIC_* may not be inlined at build time.
  // This only exposes Supabase URL + ANON key (public by design). Never expose service role.
  const publicEnv = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    // Some deployments store anon key under non-NEXT_PUBLIC names. We only expose this via runtime injection
    // (still public-by-design), never service role.
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY_PUBLIC ||
      "",
  };

  return (
    <html lang="vi" style={{ fontFamily: beVietnamPro.style.fontFamily }} className="w-full max-w-full overflow-x-hidden">
      <head>
        {/* Load Pi SDK as early as possible. Pi Browser sometimes fails to attach window.Pi when the SDK is injected late. */}
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
        <Script id="tsbio-public-env" strategy="beforeInteractive">
          {`window.__TSBIO_PUBLIC_ENV__=${JSON.stringify(publicEnv)};`}
        </Script>
      </head>
      <body className={`${beVietnamPro.className} w-full max-w-full overflow-x-hidden`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
