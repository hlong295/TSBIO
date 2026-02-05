import { supabaseAdminSelectOne } from "@/lib/supabase/admin"

/**
 * Root Admin gate for all admin APIs.
 * We only trust DB fields (profiles.role + profiles.level).
 *
 * Expected schema (from TSBIO baseline):
 * - profiles.id (uuid, references auth.users.id)
 * - profiles.role default 'member'
 * - profiles.level default 'basic'
 *
 * Root Admin rule:
 *   role = 'root_admin' AND level = 'super'
 */
export async function requireRootAdmin(profileId: string) {
  const row = await supabaseAdminSelectOne<{ role: string; level: string }>(
    "profiles",
    "role,level",
    { id: `eq.${profileId}` }
  )

  if (!row) throw new Error("USER_NOT_FOUND")
  if (row.role !== "root_admin" || row.level !== "super") {
    throw new Error("FORBIDDEN_NOT_ROOT")
  }
  return true
}
