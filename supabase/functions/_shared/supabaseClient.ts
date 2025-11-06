// @ts-ignore Supabase Edge Functions run on Deno, import via URL.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// @ts-ignore Deno global is provided at runtime by Supabase Edge Functions.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
