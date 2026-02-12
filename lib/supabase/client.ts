import { createClient } from "@supabase/supabase-js";

// Runtime env (Pi Studio / custom hosting)
const runtimeEnv =
  typeof window !== "undefined"
    ? (window as any).__TSBIO_PUBLIC_ENV__
    : undefined;

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const runtimeUrl = runtimeEnv?.supabaseUrl;

const url =
  typeof envUrl === "string"
    ? envUrl.trim()
    : typeof runtimeUrl === "string"
      ? runtimeUrl.trim()
      : "";

const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const runtimeKey = runtimeEnv?.supabaseAnonKey;

const anonKey =
  typeof envKey === "string"
    ? envKey.trim()
    : typeof runtimeKey === "string"
      ? runtimeKey.trim()
      : "";

if (!url || !anonKey) {
  console.warn("[SUPABASE] Missing public URL or anon key");
}

export const supabase = createClient(url, anonKey);
export default supabase;