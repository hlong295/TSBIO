import { supabaseBrowser } from "@/lib/supabase/client";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

/**
 * Add `Authorization: Bearer <access_token>` automatically.
 *
 * Why: our Route Handlers use `getSupabaseServerClient()` which reads the access token
 * from request headers. If we call `fetch('/api/...')` without this header, the server
 * will see the request as UNAUTHORIZED.
 */
export async function fetchWithAuth(input: FetchInput, init: FetchInit = {}) {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}
