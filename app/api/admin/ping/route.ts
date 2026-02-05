import { NextResponse } from "next/server"
import { requireRootAdmin } from "@/lib/auth/require-root-admin"

/**
 * Admin health check (root-only).
 *
 * How to call:
 *   curl -H "x-profile-id: <auth.users.id>" https://<domain>/api/admin/ping
 *
 * Note:
 * - We intentionally do NOT wire this to UI yet (to avoid breaking Pi login flow).
 * - In Phase 2, /api/auth/pi will mint a server session and we will read user from that.
 */
export async function GET(req: Request) {
  try {
    const profileId = req.headers.get("x-profile-id") || ""

    if (!profileId) {
      return NextResponse.json({ error: "MISSING_PROFILE_ID" }, { status: 401 })
    }

    await requireRootAdmin(profileId)

    return NextResponse.json({ ok: true, role: "root_admin" })
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : "FORBIDDEN"
    const status = message === "SUPABASE_ADMIN_ENV_MISSING" ? 500 : message === "MISSING_PROFILE_ID" ? 401 : 403
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
