'use client'

export const dynamic = 'force-dynamic'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const code  = searchParams.get('code')
    const next  = searchParams.get('next') ?? '/'
    const error = searchParams.get('error')

    if (error) {
      router.replace('/login?error=link_invalido')
      return
    }

    // PKCE flow: troca o code por sessão no browser (onde o code_verifier existe)
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        if (err) {
          console.error('[auth/callback] exchangeCodeForSession:', err.message)
          router.replace('/login?error=link_invalido')
        } else {
          router.replace(next === 'reset' ? '/reset-password' : next)
        }
      })
      return
    }

    // Hash/implicit flow: aguarda o evento do Supabase client
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        subscription.unsubscribe()
        router.replace('/reset-password')
      } else if (event === 'SIGNED_IN') {
        subscription.unsubscribe()
        router.replace(next === 'reset' ? '/reset-password' : next)
      }
    })

    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      router.replace('/login?error=link_invalido')
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export default function AuthCallbackPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#7AD1B8', fontFamily: 'Inter, sans-serif', fontSize: '14px', letterSpacing: '0.05em' }}>
        Verificando acesso...
      </p>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  )
}
