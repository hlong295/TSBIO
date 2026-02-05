import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isStaticAsset(pathname: string) {
  // Keep this conservative; add extensions only when needed.
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.(png|jpg|jpeg|svg|webp|ico|css|js|map|txt|woff|woff2)$/.test(pathname)
  );
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";

  // Only apply this rewrite on PiNet hostnames (Pi App Studio / Pi Desktop).
  if (!host.includes("pinet.com")) {
    return NextResponse.next();
  }

  const pathname = req.nextUrl.pathname;

  // Allow Next.js internals / APIs / assets.
  if (isStaticAsset(pathname) || pathname === "/") {
    return NextResponse.next();
  }

  // Rewrite everything else to '/' so the app can boot.
  // Keep original path in query for debugging if needed.
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("__pi_path", pathname);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/:path*"],
};
