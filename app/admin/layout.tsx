import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verifica role admin via service client (bypassa RLS)
  // IMPORTANTE: redirect() não pode ser chamado dentro de try/catch em Next.js
  // (o erro especial que ele lança seria capturado pelo catch)
  let isAdmin = false
  try {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  } catch {
    // Schema não criado ainda ou SERVICE_ROLE_KEY não configurada — nega acesso
    isAdmin = false
  }

  if (!isAdmin) redirect('/')

  return <>{children}</>
}
