import { createClient } from '@supabase/supabase-js'

// Cliente com service_role — NUNCA expor ao cliente.
// Usado apenas em API routes server-side para operações admin
// (criar/deletar usuários, ler admin_user_view que bypassa RLS).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
