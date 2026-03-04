import { NextResponse } from 'next/server'

/**
 * Verifica se a requisição vem da mesma origem (CSRF protection).
 * Valida o header Origin contra o domínio configurado.
 * Retorna um NextResponse de erro se inválido, ou null se OK.
 */
export function checkCsrf(request: Request): NextResponse | null {
  const origin = request.headers.get('origin')
  const host   = request.headers.get('host')

  // Sem origin header: requisição server-side ou curl — permite passar
  // (ambientes sem CORS não enviam Origin)
  if (!origin) return null

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const allowed = siteUrl
    ? new URL(siteUrl).origin
    : (host ? `https://${host}` : null)

  if (allowed && origin !== allowed) {
    // Permite também localhost em desenvolvimento
    const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')
    if (!isLocalhost) {
      console.error(`[csrf] Origin bloqueado: ${origin} (esperado: ${allowed})`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return null
}
