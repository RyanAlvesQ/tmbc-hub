import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

// Troca o PKCE code por uma sessão e redireciona para a página correta.
// Supabase redireciona aqui após verificar o link do email (reset de senha, etc).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const destination = next === 'reset' ? `${origin}/reset-password` : `${origin}${next}`
      return NextResponse.redirect(destination)
    }
  }

  // Falha na troca — redireciona para login com indicador de erro
  return NextResponse.redirect(`${origin}/login?error=link_invalido`)
}
