import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rate limiting em memória por worker de edge.
// Nota: em produção com múltiplas instâncias, usar Upstash Redis para estado distribuído.
// Esta implementação oferece proteção por instância (melhor que nada).
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(ip)
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (record.count >= maxRequests) return true
  record.count++
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'

  // Rate limit: rotas de auth — 10 req / 15 min por IP
  if (pathname.startsWith('/api/auth/')) {
    if (isRateLimited(`auth:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }
  }

  // Rate limit: rotas de progress — 120 req / min por IP (salvo a cada ~5s no player)
  if (pathname.startsWith('/api/progress')) {
    if (isRateLimited(`progress:${ip}`, 120, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  // Rate limit: rotas admin — 60 req / min por IP
  if (pathname.startsWith('/api/admin/')) {
    if (isRateLimited(`admin:${ip}`, 60, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  // Following the official Supabase SSR proxy pattern for Edge runtime
  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const isLoginPage = request.nextUrl.pathname === '/login'

    if (!user && !isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user && isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  } catch {
    // If proxy fails (e.g. missing env vars), allow the request through
    // and let client-side auth handle it
    const isLoginPage = request.nextUrl.pathname === '/login'
    if (!isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand_assets).*)'],
}
