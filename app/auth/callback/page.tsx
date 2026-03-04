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
    const hash  = window.location.hash

    if (error) {
      router.replace('/login?error=link_invalido')
      return
    }

    // PKCE flow: troca o code no browser (code_verifier existe no browser)
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

    // Hash/implicit flow: tokens no fragmento #access_token=...&type=recovery
    // O Supabase client (createClient acima) já lê o hash e processa os tokens.
    // onAuthStateChange dispara INITIAL_SESSION, SIGNED_IN ou PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isRecovery = hash.includes('type=recovery') || event === 'PASSWORD_RECOVERY'
      const hasSession = !!session

      if (event === 'PASSWORD_RECOVERY') {
        subscription.unsubscribe()
        router.replace('/reset-password')
        return
      }

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && hasSession) {
        subscription.unsubscribe()
        router.replace(isRecovery || next === 'reset' ? '/reset-password' : next)
        return
      }

      // Sem sessão no INITIAL_SESSION — aguarda próximo evento ou timeout
    })

    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      // Último recurso: verifica se há sessão mesmo sem evento ter disparado
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.replace(hash.includes('type=recovery') || next === 'reset' ? '/reset-password' : next)
        } else {
          router.replace('/login?error=link_invalido')
        }
      })
    }, 3000)

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
