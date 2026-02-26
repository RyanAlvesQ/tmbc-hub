'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { AdminUserRow } from '@/types'

const PRODUCTS = [
  { id: 'tmbc',   label: 'TMBC' },
  { id: 'ese',    label: 'ESE' },
  { id: 'bidcap', label: 'Bidcap' },
]

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
      background: active ? 'rgba(122,209,184,0.12)' : 'rgba(255,80,80,0.1)',
      color: active ? '#7AD1B8' : '#ff6b6b',
      border: `1px solid ${active ? 'rgba(122,209,184,0.3)' : 'rgba(255,80,80,0.2)'}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#7AD1B8' : '#ff6b6b' }} />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

function ProductChip({ label, status }: { label: string; status: string }) {
  const active = status === 'active'
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 6, fontSize: 10,
      fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      background: active ? 'rgba(122,209,184,0.15)' : 'rgba(255,255,255,0.05)',
      color: active ? '#7AD1B8' : '#666',
      border: `1px solid ${active ? 'rgba(122,209,184,0.25)' : '#2A2433'}`,
      textDecoration: active ? 'none' : 'line-through',
    }}>
      {label}
    </span>
  )
}

// ---- Modal Criar Membro ----
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'member' })
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleProduct = (id: string) =>
    setSelectedProducts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Informe um e-mail válido.'); return
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.'); return
    }
    setLoading(true); setError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, products: selectedProducts }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao criar membro'); return }
    onCreated()
    onClose()
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 20, color: '#f0ece8', margin: 0 }}>
            Novo Membro
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Email</label>
            <input
              type="email" required placeholder="email@exemplo.com"
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Senha inicial</label>
            <input
              type="password" required placeholder="Mínimo 6 caracteres"
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...fieldGroup, flex: 1 }}>
              <label style={labelStyle}>Nome completo</label>
              <input
                type="text" placeholder="Nome do membro"
                value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ ...fieldGroup, minWidth: 120 }}>
              <label style={labelStyle}>Cargo</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="member">Membro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Produtos (acesso imediato)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRODUCTS.map(p => (
                <button
                  key={p.id} type="button"
                  onClick={() => toggleProduct(p.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: selectedProducts.includes(p.id) ? '1.5px solid #7AD1B8' : '1.5px solid #2A2433',
                    background: selectedProducts.includes(p.id) ? 'rgba(122,209,184,0.15)' : 'rgba(255,255,255,0.03)',
                    color: selectedProducts.includes(p.id) ? '#7AD1B8' : '#888',
                    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
            <button type="submit" disabled={loading} style={primaryBtnStyle}>
              {loading ? 'Criando...' : 'Criar Membro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- Modal Editar Membro ----
function EditModal({ user, onClose, onSaved, onProductChanged }: { user: AdminUserRow; onClose: () => void; onSaved: () => void; onProductChanged: () => void }) {
  const [form, setForm] = useState({
    full_name: user.full_name ?? '',
    role: user.role,
    is_active: user.is_active,
    notes: user.notes ?? '',
  })
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [productLoading, setProductLoading] = useState<string | null>(null)

  async function save() {
    setLoading(true); setError('')
    const payload: Record<string, unknown> = { ...form }
    if (newPassword) payload.new_password = newPassword
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao salvar'); return }
    if (newPassword) setNewPassword('')
    onSaved()
    onClose()
  }

  async function deleteUser() {
    setLoading(true)
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao excluir'); return }
    onSaved()
    onClose()
  }

  async function grantProduct(productId: string) {
    setProductLoading(productId)
    await fetch(`/api/admin/users/${user.id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
    setProductLoading(null)
    onProductChanged()
  }

  async function revokeProduct(productId: string, reason = 'revoked') {
    setProductLoading(productId)
    await fetch(`/api/admin/users/${user.id}/products`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, reason }),
    })
    setProductLoading(null)
    onProductChanged()
  }

  const activeProductIds = user.products.filter(p => p.status === 'active').map(p => p.product_id)
  const availableToGrant = PRODUCTS.filter(p => !activeProductIds.includes(p.id))

  const bonusUnlocked = (iso: string) => new Date(iso) <= new Date()

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 20, color: '#f0ece8', margin: '0 0 4px' }}>
              Editar Membro
            </h2>
            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>{user.email}</p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Tempo Assistido', value: formatSeconds(user.total_watch_seconds) },
            { label: 'Vídeos Completos', value: String(user.completed_videos) },
            { label: 'Último Acesso', value: formatDate(user.last_seen_at) },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid #2A2433',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <p style={{ color: '#888', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>{stat.label}</p>
              <p style={{ color: '#7AD1B8', fontSize: 16, fontWeight: 700, margin: 0, fontFamily: '"Inter Tight", sans-serif' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Nome completo</label>
            <input
              type="text" value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              style={inputStyle} placeholder="Nome do membro"
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...fieldGroup, flex: 1 }}>
              <label style={labelStyle}>Role</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value as 'member' | 'admin' }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="member">Membro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ ...fieldGroup, flex: 1 }}>
              <label style={labelStyle}>Status</label>
              <select
                value={form.is_active ? 'active' : 'inactive'}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Notas internas</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              placeholder="Notas sobre este membro (visível só para admins)"
            />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Nova senha <span style={{ color: '#555', fontWeight: 400 }}>(deixe em branco para não alterar)</span></label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {/* Produtos */}
          <div>
            <label style={{ ...labelStyle, display: 'block', marginBottom: 10 }}>Produtos</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {user.products.map(p => (
                <div key={p.product_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  background: p.status === 'active' ? 'rgba(122,209,184,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${p.status === 'active' ? 'rgba(122,209,184,0.2)' : '#2A2433'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: p.status === 'active' ? '#7AD1B8' : '#555', fontWeight: 600, fontSize: 13 }}>
                      {p.product_name}
                    </span>
                    {p.status !== 'active' && (
                      <span style={{ fontSize: 10, color: '#ff6b6b', fontWeight: 600, letterSpacing: '0.05em' }}>
                        {p.status.toUpperCase()}
                      </span>
                    )}
                    {p.status === 'active' && (
                      <span style={{ fontSize: 10, color: bonusUnlocked(p.bonus_unlocks_at) ? '#F5A623' : '#666', letterSpacing: '0.04em' }}>
                        {bonusUnlocked(p.bonus_unlocks_at) ? '🎁 Bônus liberado' : `Bônus em ${formatDate(p.bonus_unlocks_at)}`}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.status === 'active' ? (
                      <>
                        <button
                          onClick={() => revokeProduct(p.product_id, 'revoked')}
                          disabled={productLoading === p.product_id}
                          style={{ ...dangerSmallBtn }}
                        >
                          Revogar
                        </button>
                        <button
                          onClick={() => revokeProduct(p.product_id, 'refunded')}
                          disabled={productLoading === p.product_id}
                          style={{ ...warnSmallBtn }}
                        >
                          Reembolso
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => grantProduct(p.product_id)}
                        disabled={productLoading === p.product_id}
                        style={{ ...successSmallBtn }}
                      >
                        Reativar
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {availableToGrant.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {availableToGrant.map(p => (
                    <button
                      key={p.id}
                      onClick={() => grantProduct(p.id)}
                      disabled={productLoading === p.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: '1.5px dashed #2A2433', background: 'transparent',
                        color: '#666', cursor: 'pointer',
                        transition: 'border-color 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#7AD1B8'; e.currentTarget.style.color = '#7AD1B8' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2433'; e.currentTarget.style.color = '#666' }}
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            {user.role === 'admin' ? (
              <span style={{ fontSize: 11, color: '#555', fontFamily: '"Inter", sans-serif' }}>
                Administradores não podem ser excluídos
              </span>
            ) : !confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={deleteBtnStyle}>
                Excluir Usuário
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#ff6b6b', fontSize: 13 }}>Tem certeza?</span>
                <button onClick={deleteUser} disabled={loading} style={{ ...deleteBtnStyle, opacity: 1 }}>Confirmar</button>
                <button onClick={() => setConfirmDelete(false)} style={cancelBtnStyle}>Cancelar</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={cancelBtnStyle}>Fechar</button>
              <button onClick={save} disabled={loading} style={primaryBtnStyle}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Componente principal ----
export default function AdminPanel() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterProduct, setFilterProduct] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null)
  const editUserIdRef = useRef<string | null>(null)
  editUserIdRef.current = editUser?.id ?? null

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users ?? [])
    }
    setLoading(false)
  }, [])

  // Refreshes user list and updates editUser in-place (keeps modal open)
  const refreshWithModal = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      const freshUsers: AdminUserRow[] = data.users ?? []
      setUsers(freshUsers)
      const currentId = editUserIdRef.current
      if (currentId) {
        const fresh = freshUsers.find(u => u.id === currentId)
        if (fresh) setEditUser(fresh)
      }
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = users.filter(u => {
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) &&
        !(u.full_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus === 'active' && !u.is_active) return false
    if (filterStatus === 'inactive' && u.is_active) return false
    if (filterProduct !== 'all' && !u.products.some(p => p.product_id === filterProduct && p.status === 'active')) return false
    return true
  })

  const totalActive = users.filter(u => u.is_active).length
  const totalWatch = users.reduce((s, u) => s + u.total_watch_seconds, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#07040B', color: '#f0ece8', fontFamily: 'Inter, sans-serif' }}>
      {/* Grain texture */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.025, pointerEvents: 'none', zIndex: 0 }}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* Ambient glow */}
      <div style={{ position: 'fixed', top: -200, left: '30%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(122,209,184,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid #2A2433',
              color: '#888', textDecoration: 'none', fontSize: 16,
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f0ece8'; e.currentTarget.style.borderColor = '#444' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#2A2433' }}
            >←</Link>
            <div>
              <h1 style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 24, fontWeight: 700, margin: 0, color: '#f0ece8' }}>
                Painel Admin
              </h1>
              <p style={{ color: '#555', fontSize: 13, margin: 0 }}>Gerenciamento de membros</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #7AD1B8 0%, #5ab89e 100%)',
              color: '#07040B', fontWeight: 700, fontSize: 13, fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 20px rgba(122,209,184,0.25)',
              transition: 'opacity 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Novo Membro
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total de Membros', value: users.length, color: '#f0ece8' },
            { label: 'Ativos', value: totalActive, color: '#7AD1B8' },
            { label: 'Inativos', value: users.length - totalActive, color: '#ff6b6b' },
            { label: 'Horas Assistidas', value: formatSeconds(totalWatch), color: '#F5A623' },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '18px 20px', borderRadius: 14,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid #2A2433',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}>
              <p style={{ color: '#555', fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                {stat.label}
              </p>
              <p style={{ color: stat.color, fontSize: 26, fontWeight: 700, margin: 0, fontFamily: '"Inter Tight", sans-serif' }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: 14 }}>🔍</span>
            <input
              type="text" placeholder="Buscar por email ou nome..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 36, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')} style={{ ...inputStyle, minWidth: 130 }}>
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} style={{ ...inputStyle, minWidth: 140 }}>
            <option value="all">Todos os produtos</option>
            {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={{ borderRadius: 14, border: '1px solid #2A2433', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 100px 1fr 1fr 80px',
            padding: '12px 20px', background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid #2A2433',
          }}>
            {['Email / Nome', 'Produtos', 'Cargo', 'Status', 'Assistido', ''].map((h, i) => (
              <span key={i} style={{ color: '#555', fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600 }}>
                {h}
              </span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#555' }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#555' }}>Nenhum membro encontrado</div>
          ) : (
            filtered.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 100px 1fr 1fr 80px',
                  padding: '14px 20px', alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(42,36,51,0.6)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(122,209,184,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: '#f0ece8', fontWeight: 500 }}>{u.email}</p>
                  {u.full_name && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#666' }}>{u.full_name}</p>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {u.products.length === 0
                    ? <span style={{ color: '#444', fontSize: 11 }}>Nenhum</span>
                    : u.products.map(p => <ProductChip key={p.product_id} label={p.product_name} status={p.status} />)
                  }
                </div>
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                    background: u.role === 'admin' ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.05)',
                    color: u.role === 'admin' ? '#F5A623' : '#888',
                    border: `1px solid ${u.role === 'admin' ? 'rgba(245,166,35,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    {u.role === 'admin' ? 'Admin' : 'Membro'}
                  </span>
                </div>
                <div><StatusBadge active={u.is_active} /></div>
                <div style={{ color: '#7AD1B8', fontSize: 13, fontWeight: 600, fontFamily: '"Inter Tight", sans-serif' }}>
                  {formatSeconds(u.total_watch_seconds)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setEditUser(u)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid #2A2433',
                      background: 'rgba(255,255,255,0.03)', color: '#888', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#7AD1B8'; e.currentTarget.style.color = '#7AD1B8' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2433'; e.currentTarget.style.color = '#888' }}
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <p style={{ color: '#333', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
          {filtered.length} de {users.length} membros
        </p>
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchUsers}
        />
      )}

      {editUser && (
        <EditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { fetchUsers(); setEditUser(null) }}
          onProductChanged={refreshWithModal}
        />
      )}
    </div>
  )
}

// ---- Estilos compartilhados ----
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(7,4,11,0.85)', backdropFilter: 'blur(8px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}

const modalStyle: React.CSSProperties = {
  background: '#0f0c14',
  border: '1px solid #2A2433',
  borderRadius: 18,
  padding: 28,
  width: '100%',
  maxWidth: 480,
  boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(122,209,184,0.06)',
  maxHeight: '90vh',
  overflowY: 'auto',
}

const fieldGroup: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6,
}

const labelStyle: React.CSSProperties = {
  color: '#666', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid #2A2433',
  borderRadius: 8, padding: '10px 12px',
  color: '#f0ece8', fontSize: 13,
  outline: 'none', fontFamily: 'Inter, sans-serif',
}

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#555',
  cursor: 'pointer', fontSize: 16, padding: 4, lineHeight: 1,
  transition: 'color 0.15s',
}

const primaryBtnStyle: React.CSSProperties = {
  flex: 1, padding: '10px 20px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #7AD1B8 0%, #5ab89e 100%)',
  color: '#07040B', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 10,
  border: '1px solid #2A2433', background: 'transparent',
  color: '#888', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
}

const deleteBtnStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8,
  border: '1px solid rgba(255,80,80,0.25)', background: 'rgba(255,80,80,0.06)',
  color: '#ff6b6b', fontSize: 12, cursor: 'pointer', fontWeight: 600,
}

const dangerSmallBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  border: '1px solid rgba(255,80,80,0.25)', background: 'rgba(255,80,80,0.08)', color: '#ff6b6b',
}

const warnSmallBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(245,166,35,0.08)', color: '#F5A623',
}

const successSmallBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  border: '1px solid rgba(122,209,184,0.25)', background: 'rgba(122,209,184,0.08)', color: '#7AD1B8',
}
