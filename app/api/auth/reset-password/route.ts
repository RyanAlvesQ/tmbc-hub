import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { email, redirectTo } = await request.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl && !redirectTo) {
    console.error('NEXT_PUBLIC_SITE_URL não configurado e redirectTo não foi fornecido')
    return NextResponse.json({ error: 'Erro de configuração do servidor.' }, { status: 500 })
  }

  // Verifica se o email está cadastrado na tabela profiles (server-side, admin client)
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (!profile) {
    return NextResponse.json(
      { error: 'Este e-mail não está cadastrado. Entre em contato com o suporte.' },
      { status: 404 }
    )
  }

  // Email existe — dispara o reset via client server-side (usa anon key)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const destination = redirectTo ?? `${siteUrl}/login`
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: destination,
  })

  if (error) {
    console.error('Supabase resetPasswordForEmail error:', error.message)
    return NextResponse.json({ error: 'Erro ao enviar o e-mail. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
