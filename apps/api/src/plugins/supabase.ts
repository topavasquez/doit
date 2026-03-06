import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — auth will not work')
}

export const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
