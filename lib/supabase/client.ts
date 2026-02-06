import { createClient } from "@supabase/supabase-js";

// Client-side Supabase (anon) — used ONLY for authentication.
// TSBIO Constitution: token/wallet/ledger operations MUST go through server APIs.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't throw hard on build; show a clear runtime error instead.
  // Many deployments set envs after build.
  console.warn("[TSBIO] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabaseBrowser = createClient(url || "", anonKey || "");
