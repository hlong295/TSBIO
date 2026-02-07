import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * IMPORTANT:
 * Supabase auth (email login) is persisted in localStorage (per-origin).
 * If users switch between `tsbio.life` and `www.tsbio.life`, they'll look
 * "logged in" on one origin and "logged out" on the other.
 *
 * To prevent hard-to-debug auth mismatches (the user called it "cookies" issue),
 * we enforce a single canonical host: `www.tsbio.life`.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  // Only apply for production custom domain.
  if (host === "tsbio.life") {
    const url = req.nextUrl.clone();
    url.hostname = "www.tsbio.life";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
