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

    // PKCE flow: vem do "Esqueci minha senha" no login (browser gerou code_verifier)
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

    // OTP/implicit flow: vem do webhook de compra (hash tokens no URL)
    // Ex: #access_token=xxx&refresh_token=xxx&type=recovery
    const hash = window.location.hash.substring(1) // remove o #
    const params = new URLSearchParams(hash)
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type         = params.get('type')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: err }) => {
          if (err) {
            console.error('[auth/callback] setSession:', err.message)
            router.replace('/login?error=link_invalido')
          } else {
            const isRecovery = type === 'recovery' || next === 'reset'
            router.replace(isRecovery ? '/reset-password' : next)
          }
        })
      return
    }

    // Sem code nem hash tokens — link inválido
    router.replace('/login?error=link_invalido')
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
