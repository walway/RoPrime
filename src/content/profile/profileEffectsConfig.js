/** Injected at build time from .env via Vite `define`. */
export const SUPABASE_URL =
	typeof __ROPrime_SUPABASE_URL__ !== "undefined"
		? String(__ROPrime_SUPABASE_URL__ || "").trim()
		: "";

export const SUPABASE_ANON_KEY =
	typeof __ROPrime_SUPABASE_ANON_KEY__ !== "undefined"
		? String(__ROPrime_SUPABASE_ANON_KEY__ || "").trim()
		: "";

export function isSupabaseProfileEffectsEnabled() {
	return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
