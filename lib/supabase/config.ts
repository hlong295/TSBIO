// Centralized Supabase configuration.
//
// IMPORTANT:
// - Pi hosting environments may inject placeholder or stale env vars.
// - If client/server point to DIFFERENT Supabase projects, you'll see:
//   "login OK" -> then immediately "văng" (session appears missing).
//
// Strategy:
// - Prefer env vars when they exist AND are consistent (URL ref matches JWT ref).
// - Otherwise fall back to hard-coded values.
// - You can force hard-coded by setting: NEXT_PUBLIC_FORCE_HARDCODED_SUPABASE=1

// IMPORTANT: These must match your Supabase project.
const HARDCODED_SUPABASE_URL = "https://uvsqyssqzipebpkytdkl.supabase.co"
const HARDCODED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c3F5c3NxemlwZWJwa3l0ZGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzQ3MTEsImV4cCI6MjA4NTg1MDcxMX0.Z1JTUabH8b0VksaS9gQehdKTYVURuIJRaQfjdFnsJhQ"

function isValidSupabaseUrl(v?: string) {
	if (!v) return false
	if (!/^https?:\/\//i.test(v)) return false
	return v.includes(".supabase.co")
}

function isValidAnonKey(v?: string) {
	// Supabase anon JWT typically starts with eyJ and is fairly long
	if (!v) return false
	if (!v.startsWith("eyJ")) return false
	return v.length > 100
}

function getProjectRefFromUrl(url?: string) {
	if (!url) return ""
	try {
		const u = new URL(url)
		return u.hostname.split(".")[0] || ""
	} catch {
		return ""
	}
}

const FORCE_HARDCODED = process.env.NEXT_PUBLIC_FORCE_HARDCODED_SUPABASE === "1"
const ENV_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ENV_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let pickedUrl = HARDCODED_SUPABASE_URL
let pickedAnon = HARDCODED_SUPABASE_ANON_KEY

if (!FORCE_HARDCODED && isValidSupabaseUrl(ENV_URL) && isValidAnonKey(ENV_ANON)) {
	const refUrl = getProjectRefFromUrl(ENV_URL)
	const refJwt = getSupabaseProjectRefFromAnonKey(ENV_ANON)
	const refOk = !refUrl || !refJwt || refUrl === refJwt
	if (refOk) {
		pickedUrl = ENV_URL as string
		pickedAnon = ENV_ANON as string
	}
}

export const SUPABASE_URL = pickedUrl
export const SUPABASE_ANON_KEY = pickedAnon

// Try to decode the Supabase project ref from the anon JWT payload.
// This is used ONLY for debugging (safe to show; does not reveal the secret).
export function getSupabaseProjectRefFromAnonKey(key?: string): string {
	try {
		if (!key) return ""
		const parts = key.split(".")
		if (parts.length < 2) return ""
		const b64 = parts[1]
		// add padding
		const padded = b64 + "===".slice((b64.length + 3) % 4)
		// Decode base64url in both browser and node.
		const base64 = padded.replace(/-/g, "+").replace(/_/g, "/")
		let json = ""
		if (typeof window !== "undefined" && typeof window.atob === "function") {
			json = decodeURIComponent(
				Array.prototype.map
					.call(window.atob(base64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
					.join("")
			)
		} else {
			// Node.js / server runtime
			json = Buffer.from(base64, "base64").toString("utf8")
		}
		const payload = JSON.parse(json)
		return typeof payload?.ref === "string" ? payload.ref : ""
	} catch {
		return ""
	}
}

export const SUPABASE_PROJECT_REF = getSupabaseProjectRefFromAnonKey(SUPABASE_ANON_KEY)
