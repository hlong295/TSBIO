import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * IMPORTANT:
 * Supabase auth (email login) is persisted in localStorage (per-origin).
 * If users switch between `tsbio.life` and `www.tsbio.life`, they'll look
 * "logged in" on one origin and "logged out" on the other.
 *
 * To prevent hard-to-debug auth mismatches (the user called it "cookies" issue),
 * we enforce a single canonical host.
 *
 * We use `tsbio.life` (no www) as canonical because that's what the project
 * is primarily accessed with, and splitting origins breaks persisted auth.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  // Only apply for production custom domain.
  if (host === "www.tsbio.life") {
    const url = req.nextUrl.clone();
    url.hostname = "tsbio.life";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
