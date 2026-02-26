'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

type View = 'login' | 'reset' | 'newpwd'

function mapError(msg: string): string {
  if (!msg) return 'Ocorreu um erro. Tente novamente.'
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('Email not confirmed'))        return 'Confirme seu e-mail antes de entrar.'
  if (msg.includes('Too many requests'))          return 'Muitas tentativas. Aguarde alguns minutos.'
  if (msg.includes('User not found'))             return 'Usuário não encontrado.'
  if (msg.includes('Password should be'))         return 'A senha deve ter pelo menos 6 caracteres.'
  if (msg.includes('Unable to validate'))         return 'Sessão expirada. Solicite um novo link.'
  if (msg.includes('same password'))              return 'A nova senha deve ser diferente da atual.'
  return msg
}

export default function LoginPage() {
  const [view, setView] = useState<View>('login')
  const [showPwd, setShowPwd] = useState(false)

  // Login state
  const [loginAlert, setLoginAlert] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Reset state
  const [resetAlert, setResetAlert] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  // New password state
  const [newPwdAlert, setNewPwdAlert] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [newPwdLoading, setNewPwdLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // On mount: detect recovery link, redirect if already logged in
  useEffect(() => {
    const isRecovery = window.location.hash.includes('type=recovery')
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const session = data.session
      if (isRecovery && session) {
        history.replaceState(null, '', window.location.pathname)
        setView('newpwd')
        return
      }
      if (session) router.replace('/')
    })
    if (window.location.hash === '#reset') setView('reset')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const passOk = password.length >= 6

    if (!emailOk) {
      setLoginAlert('Informe um e-mail válido.')
      return
    }
    if (!passOk) {
      setLoginAlert('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoginLoading(true)
    setLoginAlert('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoginLoading(false)

    if (error) {
      setLoginAlert(mapError(error.message))
    } else {
      router.replace('/')
    }
  }

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('resetEmail') as HTMLInputElement).value.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return

    setResetLoading(true)
    setResetAlert(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    })
    setResetLoading(false)

    if (error) {
      setResetAlert({ msg: mapError(error.message), type: 'error' })
    } else {
      setResetAlert({ msg: 'Link enviado! Verifique sua caixa de entrada e a pasta de spam.', type: 'success' })
    }
  }

  const handleNewPwd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const newPwd = (form.elements.namedItem('newPwd') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirmPwd') as HTMLInputElement).value

    if (newPwd.length < 8) {
      setNewPwdAlert({ msg: 'A senha deve ter pelo menos 8 caracteres.', type: 'error' })
      return
    }
    if (newPwd !== confirm) {
      setNewPwdAlert({ msg: 'As senhas não coincidem.', type: 'error' })
      return
    }

    setNewPwdLoading(true)
    setNewPwdAlert(null)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setNewPwdLoading(false)

    if (error) {
      setNewPwdAlert({ msg: mapError(error.message), type: 'error' })
    } else {
      setNewPwdAlert({ msg: 'Senha atualizada! Redirecionando...', type: 'success' })
      setTimeout(() => router.replace('/'), 2000)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Background decoration */}
      <div className="bg-glow-teal" />
      <div className="bg-glow-blue" />
      <div className="bg-glow-center" />
      <div className="bg-grid" />
      <div className="corner-tl" />
      <div className="corner-br" />

      <div className="login-container">
        {/* Logo */}
        <div className="logo-area">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-img" src="/brand_assets/TMBC.png" alt="The Media Buyer Club" />
          <span className="logo-tagline">Área de Membros</span>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-top-bar" />
          <div className="card-body">

            {/* VIEW: LOGIN */}
            <div className={`view${view === 'login' ? ' active' : ''}`}>
              <div className="section-label">Acesso à área de membros</div>
              <h1 className="card-title">Bem-vindo de volta</h1>
              <p className="card-subtitle">Entre com suas credenciais para continuar</p>

              {loginAlert && (
                <div className="alert alert-error show">{loginAlert}</div>
              )}

              <form onSubmit={handleLogin} noValidate>
                <div className="field-group">
                  <label className="field-label" htmlFor="loginEmail">E-mail</label>
                  <div className="field-wrap">
                    <input className="field-input" id="loginEmail" name="email" type="email" placeholder="seu@email.com" autoComplete="email" required />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="loginPassword">Senha</label>
                  <div className="field-wrap">
                    <input
                      className="field-input has-icon"
                      id="loginPassword"
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowPwd(!showPwd)} aria-label="Mostrar senha">
                      {!showPwd ? (
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <a className="forgot-link" href="#" onClick={(e) => { e.preventDefault(); setView('reset') }}>Esqueci minha senha</a>

                <button type="submit" className="btn-submit" disabled={loginLoading}>
                  {loginLoading ? (
                    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(4,32,30,.3)', borderTopColor: '#04201E', borderRadius: '50%', animation: 'spin-btn 0.6s linear infinite' }} />
                  ) : 'ENTRAR'}
                </button>
              </form>
            </div>

            {/* VIEW: RESET */}
            <div className={`view${view === 'reset' ? ' active' : ''}`}>
              <button className="back-link" onClick={() => setView('login')}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                VOLTAR AO LOGIN
              </button>

              <div className="section-label">Recuperação de acesso</div>
              <h1 className="card-title">Redefinir senha</h1>
              <p className="card-subtitle">Insira seu e-mail e enviaremos um link para criar uma nova senha.</p>

              {resetAlert && (
                <div className={`alert ${resetAlert.type === 'error' ? 'alert-error' : 'alert-success'} show`}>{resetAlert.msg}</div>
              )}

              <form onSubmit={handleReset} noValidate>
                <div className="field-group">
                  <label className="field-label" htmlFor="resetEmail">E-mail cadastrado</label>
                  <div className="field-wrap">
                    <input className="field-input" id="resetEmail" name="resetEmail" type="email" placeholder="seu@email.com" autoComplete="email" required />
                  </div>
                </div>
                <button type="submit" className="btn-submit" disabled={resetLoading}>
                  {resetLoading ? '...' : 'ENVIAR LINK DE REDEFINIÇÃO'}
                </button>
              </form>

              <p className="card-footer-text" style={{ marginTop: 24 }}>
                Lembrou a senha?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setView('login') }}>Voltar ao login</a>
              </p>
            </div>

            {/* VIEW: NEW PASSWORD */}
            <div className={`view${view === 'newpwd' ? ' active' : ''}`}>
              <div className="section-label">Nova senha</div>
              <h1 className="card-title">Criar nova senha</h1>
              <p className="card-subtitle">Escolha uma senha segura para sua conta.</p>

              {newPwdAlert && (
                <div className={`alert ${newPwdAlert.type === 'error' ? 'alert-error' : 'alert-success'} show`}>{newPwdAlert.msg}</div>
              )}

              <form onSubmit={handleNewPwd} noValidate>
                <div className="field-group">
                  <label className="field-label" htmlFor="newPwd">Nova Senha</label>
                  <div className="field-wrap">
                    <input className="field-input" id="newPwd" name="newPwd" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" required />
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="confirmPwd">Confirmar Senha</label>
                  <div className="field-wrap">
                    <input className="field-input" id="confirmPwd" name="confirmPwd" type="password" placeholder="Repita a nova senha" autoComplete="new-password" required />
                  </div>
                </div>
                <button type="submit" className="btn-submit" disabled={newPwdLoading}>
                  {newPwdLoading ? '...' : 'SALVAR NOVA SENHA'}
                </button>
              </form>
            </div>

          </div>
        </div>

        <p className="bottom-stamp">© 2025 THE MEDIA BUYER CLUB · TODOS OS DIREITOS RESERVADOS</p>
      </div>
    </div>
  )
}
