import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * In Vite, missing env vars are `undefined`. Supabase's `createClient` will throw
 * if URL/key are empty, which can white-screen the app. We instead export `null`
 * and let callers handle the unconfigured case gracefully.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null

if (!isSupabaseConfigured) {
  // This is intentionally loud for debugging, but non-fatal for runtime.
  console.error(
    '[supabaseClient] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Check frontend/.env and restart the dev server.',
  )
}

