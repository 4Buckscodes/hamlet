import { createClient } from '@supabase/supabase-js'

export const isSupabaseBrowserKeySafe = (key?: string) => {
  const trimmedKey = key?.trim()
  if (!trimmedKey || trimmedKey.toLowerCase().startsWith('sb_secret_')) return false

  const tokenParts = trimmedKey.split('.')
  if (tokenParts.length === 3) {
    try {
      const payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')
      const decodedPayload = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))
      const claims = JSON.parse(decodedPayload) as { role?: string }
      if (claims.role === 'service_role') return false
    } catch {
      return false
    }
  }

  return true
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && isSupabaseBrowserKeySafe(supabaseAnonKey))

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null