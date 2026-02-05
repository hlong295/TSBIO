/**
 * Server-only Supabase Admin fetch helper (NO supabase-js dependency).
 * Requires env:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */
export function getSupabaseAdminEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_ADMIN_ENV_MISSING")
  }

  return { url, serviceKey }
}

export async function supabaseAdminSelectOne<T = any>(
  table: string,
  select: string,
  filters: Record<string, string>
): Promise<T | null> {
  const { url, serviceKey } = getSupabaseAdminEnv()

  const usp = new URLSearchParams()
  usp.set("select", select)
  for (const [k, v] of Object.entries(filters)) {
    // v should already be like: "eq.<value>"
    usp.set(k, v)
  }
  usp.set("limit", "1")

  const res = await fetch(`${url}/rest/v1/${table}?${usp.toString()}`, {
    method: "GET",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`SUPABASE_ADMIN_HTTP_${res.status}:${text.slice(0, 200)}`)
  }

  const rows = (await res.json()) as any[]
  return rows?.[0] ?? null
}
