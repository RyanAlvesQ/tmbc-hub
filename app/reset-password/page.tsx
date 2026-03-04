'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function mapError(msg: string): string {
  if (!msg) return 'Ocorreu um erro. Tente novamente.'
  if (msg.includes('Password should be')) return 'A senha deve ter pelo menos 8 caracteres.'
  if (msg.includes('same password'))      return 'A nova senha deve ser diferente da atual.'
  if (msg.includes('Unable to validate')) return 'Sessão expirada. Solicite um novo link.'
  return msg
}

export default function ResetPasswordPage() {
  const [alert, setAlert] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const newPwd = (form.elements.namedItem('newPwd') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirmPwd') as HTMLInputElement).value

    if (newPwd.length < 8) {
      setAlert({ msg: 'A senha deve ter pelo menos 8 caracteres.', type: 'error' })
      return
    }
    if (newPwd !== confirm) {
      setAlert({ msg: 'As senhas não coincidem.', type: 'error' })
      return
    }

    setLoading(true)
    setAlert(null)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setLoading(false)

    if (error) {
      setAlert({ msg: mapError(error.message), type: 'error' })
    } else {
      setAlert({ msg: 'Senha criada com sucesso! Redirecionando...', type: 'success' })
      setTimeout(() => router.replace('/'), 2000)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div className="bg-glow-teal" />
      <div className="bg-glow-blue" />
      <div className="bg-glow-center" />
      <div className="bg-grid" />
      <div className="corner-tl" />
      <div className="corner-br" />

      <div className="login-container">
        <div className="logo-area">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-img" src="/brand_assets/TMBC.png" alt="The Media Buyer Club" />
          <span className="logo-tagline">Área de Membros</span>
        </div>

        <div className="card">
          <div className="card-top-bar" />
          <div className="card-body">
            <div className="section-label">Bem-vindo ao TMBC</div>
            <h1 className="card-title">Criar sua senha</h1>
            <p className="card-subtitle">Escolha uma senha para acessar sua conta.</p>

            {alert && (
              <div className={`alert ${alert.type === 'error' ? 'alert-error' : 'alert-success'} show`}>
                {alert.msg}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="field-group">
                <label className="field-label" htmlFor="newPwd">Nova Senha</label>
                <div className="field-wrap">
                  <input
                    className="field-input"
                    id="newPwd"
                    name="newPwd"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="confirmPwd">Confirmar Senha</label>
                <div className="field-wrap">
                  <input
                    className="field-input"
                    id="confirmPwd"
                    name="confirmPwd"
                    type="password"
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(4,32,30,.3)', borderTopColor: '#04201E', borderRadius: '50%', animation: 'spin-btn 0.6s linear infinite' }} />
                ) : 'CRIAR SENHA E ENTRAR'}
              </button>
            </form>
          </div>
        </div>

        <p className="bottom-stamp">© 2025 THE MEDIA BUYER CLUB · TODOS OS DIREITOS RESERVADOS</p>
      </div>
    </div>
  )
}
