'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNotifRead, markAllNotifsRead } from '@/lib/storage'

interface TopbarProps {
  alwaysScrolled?: boolean
}

const NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Nova aula disponível',
    body: 'Como criar novos top spenders — toda semana',
    time: 'Hoje',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <polygon points="23 7 16 12 23 17 23 7" strokeLinejoin="round" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'notif-2',
    title: 'Atualização semanal publicada',
    body: 'Atualização — 30.01.26 já está disponível no hub',
    time: 'Ontem',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'notif-3',
    title: 'Novo conteúdo no hub',
    body: 'Outros modos e otimização — assista agora',
    time: '2 dias',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'notif-4',
    title: 'Conteúdo exclusivo',
    body: 'Criativos que escalaram com menos de $500',
    time: '3 dias',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'notif-5',
    title: 'Aula em destaque',
    body: 'Estratégia de escala — novo upload disponível',
    time: '1 semana',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function Topbar({ alwaysScrolled = false }: TopbarProps) {
  const [scrolled, setScrolled] = useState(alwaysScrolled)
  const [modalOpen, setModalOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [changePwdOpen, setChangePwdOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userInitials, setUserInitials] = useState('MBC')
  const [pwdAlert, setPwdAlert] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [readIds, setReadIds] = useState<string[]>([])
  const modalRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const notifBellRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const hasUnread = NOTIFICATIONS.some(n => !readIds.includes(n.id))

  useEffect(() => {
    if (alwaysScrolled) return
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [alwaysScrolled])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email || ''
      setUserEmail(email)
      if (email) {
        const parts = email.split('@')[0].split(/[._-]/)
        const initials = parts.length >= 2
          ? (parts[0][0] + parts[1][0]).toUpperCase()
          : email.slice(0, 2).toUpperCase()
        setUserInitials(initials)
      }
    })
    setReadIds(getNotifRead())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalOpen(false)
        setChangePwdOpen(false)
      }
      const clickedBell = notifBellRef.current?.contains(e.target as Node)
      if (!clickedBell && notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleBellClick = () => {
    const next = !notifOpen
    setNotifOpen(next)
    setModalOpen(false)
    if (next) {
      const allIds = NOTIFICATIONS.map(n => n.id)
      markAllNotifsRead(allIds)
      setReadIds(allIds)
    }
  }

  const handleMarkAllRead = () => {
    const allIds = NOTIFICATIONS.map(n => n.id)
    markAllNotifsRead(allIds)
    setReadIds(allIds)
  }

  const handleChangePwd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const newPwd = (form.elements.namedItem('newPwd') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirmPwd') as HTMLInputElement).value

    if (newPwd.length < 8) {
      setPwdAlert({ msg: 'Mínimo 8 caracteres.', type: 'error' })
      return
    }
    if (newPwd !== confirm) {
      setPwdAlert({ msg: 'As senhas não coincidem.', type: 'error' })
      return
    }

    setPwdLoading(true)
    setPwdAlert(null)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdLoading(false)
    if (error) {
      setPwdAlert({ msg: error.message, type: 'error' })
    } else {
      setPwdAlert({ msg: 'Senha atualizada com sucesso!', type: 'success' })
      form.reset()
      setTimeout(() => {
        setChangePwdOpen(false)
        setModalOpen(false)
        setPwdAlert(null)
      }, 2000)
    }
  }

  const topbarClass = ['topbar', scrolled || alwaysScrolled ? 'scrolled' : ''].filter(Boolean).join(' ')

  return (
    <>
      <header className={topbarClass} id="topbar">
        <div className="topbar-left">
          <div className="topbar-greeting">
            <span style={{ color: 'var(--text-dim)' }}>PLANO PRO</span>
          </div>
        </div>

        <div className="search-wrap">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input className="search-input" type="text" placeholder="Buscar aulas, tópicos..." />
        </div>

        <div className="topbar-right">
          <div
            ref={notifBellRef}
            className="icon-btn notif-btn"
            onClick={handleBellClick}
            style={{ cursor: 'pointer' }}
          >
            {hasUnread && <div className="notif-dot" />}
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div
            className="avatar"
            onClick={() => { setModalOpen(!modalOpen); setNotifOpen(false); setChangePwdOpen(false); setPwdAlert(null) }}
          >
            {userInitials}
          </div>
        </div>
      </header>

      {/* Notification Panel */}
      <div ref={notifRef} className={`notif-panel${notifOpen ? ' open' : ''}`}>
        <div style={{ height: 2, background: 'linear-gradient(90deg, var(--teal), #5B9BD5)' }} />
        <div className="notif-panel-header">
          <span className="notif-panel-title">Notificações</span>
          <span className="notif-panel-count">{NOTIFICATIONS.length}</span>
        </div>
        <div className="notif-list">
          {NOTIFICATIONS.map(n => (
            <div key={n.id} className={`notif-item${readIds.includes(n.id) ? '' : ' unread'}`}>
              <div className="notif-icon-box">{n.icon}</div>
              <div className="notif-content">
                <div className="notif-item-title">{n.title}</div>
                <div className="notif-item-body">{n.body}</div>
                <div className="notif-item-time">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
        {hasUnread && (
          <div className="notif-footer">
            <button className="notif-mark-read" onClick={handleMarkAllRead}>
              MARCAR TUDO COMO LIDO
            </button>
          </div>
        )}
      </div>

      {/* User modal */}
      <div ref={modalRef} className={`user-modal${modalOpen ? ' open' : ''}`}>
        {/* Top gradient bar */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, var(--teal), #5B9BD5)' }} />

        <div className="user-modal-header">
          <div className="user-modal-avatar">{userInitials}</div>
          <div className="user-modal-info">
            <div className="user-modal-name">{userEmail.split('@')[0] || 'Membro'}</div>
            <div className="user-modal-email">{userEmail}</div>
            <div className="user-modal-badge">
              <div className="user-modal-badge-dot" />
              PLANO PRO
            </div>
          </div>
        </div>

        {!changePwdOpen ? (
          <div className="user-modal-body">
            <button className="user-modal-item" onClick={() => setChangePwdOpen(true)}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ALTERAR SENHA
            </button>
            <div className="user-modal-divider" />
            <button className="user-modal-item logout" onClick={handleLogout}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              SAIR DA CONTA
            </button>
          </div>
        ) : (
          <div style={{ padding: '14px 16px 16px' }}>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '.08em', color: 'var(--text-muted)', padding: 0, marginBottom: 14 }}
              onClick={() => { setChangePwdOpen(false); setPwdAlert(null) }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              VOLTAR
            </button>

            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '.14em', color: 'var(--teal)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" /></svg>
              ALTERAR SENHA
            </div>

            {pwdAlert && (
              <div style={{ borderRadius: 6, padding: '9px 12px', fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '.04em', lineHeight: 1.5, marginBottom: 12, background: pwdAlert.type === 'error' ? 'rgba(239,95,95,.08)' : 'rgba(122,209,184,.08)', border: `1px solid ${pwdAlert.type === 'error' ? 'rgba(239,95,95,.2)' : 'rgba(122,209,184,.2)'}`, color: pwdAlert.type === 'error' ? '#FF8FA3' : 'var(--teal)' }}>
                {pwdAlert.msg}
              </div>
            )}

            <form onSubmit={handleChangePwd} noValidate>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '.1em', color: 'var(--text-muted)', marginBottom: 5 }}>NOVA SENHA</label>
                <input name="newPwd" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password"
                  style={{ width: '100%', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(58,50,74,1)', borderRadius: 8, padding: '9px 12px', fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '.1em', color: 'var(--text-muted)', marginBottom: 5 }}>CONFIRMAR</label>
                <input name="confirmPwd" type="password" placeholder="Repita a nova senha" autoComplete="new-password"
                  style={{ width: '100%', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(58,50,74,1)', borderRadius: 8, padding: '9px 12px', fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <button type="submit" disabled={pwdLoading}
                style={{ width: '100%', padding: '10px 16px', background: 'linear-gradient(135deg,#5FBFA8,#7AD1B8)', border: 'none', borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '.14em', color: '#07040B', cursor: pwdLoading ? 'not-allowed' : 'pointer', opacity: pwdLoading ? 0.6 : 1 }}>
                {pwdLoading ? '...' : 'SALVAR NOVA SENHA'}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
