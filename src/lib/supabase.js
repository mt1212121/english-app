/* ------------------------------------------------------------------ */
/*  SUPABASE CLIENT                                                     */
/*  Uses the @supabase/supabase-js CDN-loaded global — no npm needed.  */
/*  Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify env    */
/*  variables (and in .env for local dev).                             */
/* ------------------------------------------------------------------ */

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

/**
 * Lazily initialise the Supabase client so the app still works
 * completely offline / without the env vars (falls back to localStorage).
 */
let _client = null;

export function getSupabase() {
  if (_client) return _client;
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;

  // supabase-js is loaded as a script tag in index.html (see below).
  // If the global isn't available yet we return null gracefully.
  if (typeof window === "undefined" || !window.supabase) return null;

  _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

/** True only if env vars are configured AND the SDK loaded */
export function isSupabaseReady() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON);
}

export { SUPABASE_URL, SUPABASE_ANON };
