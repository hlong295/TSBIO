import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APP_CONFIG } from "@/lib/app-config";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap"
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
    <html lang="vi">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
