'use client'

export const dynamic = 'force-dynamic'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { CATALOG, PRODUCT_CATALOG } from '@/lib/catalog'
import { getWP, getCompleted } from '@/lib/storage'
import { createClient } from '@/lib/supabase/client'
import type { Video } from '@/types'

const PlayIcon = () => (
  <svg width="18" height="18" fill="#050810" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
)

function VideoCard({ video, progress, completed, product }: {
  video: Video
  progress?: number
  completed?: boolean
  product: (typeof PRODUCT_CATALOG)[number]
}) {
  return (
    <Link href={`/player?v=${video.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          borderRadius: 14,
          border: `1px solid rgba(${product.colorRgb},0.12)`,
          background: 'rgba(255,255,255,0.02)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-3px)'
          e.currentTarget.style.boxShadow = `0 12px 40px rgba(${product.colorRgb},0.15)`
          e.currentTarget.style.borderColor = `rgba(${product.colorRgb},0.3)`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.borderColor = `rgba(${product.colorRgb},0.12)`
        }}
      >
        {/* Thumbnail */}
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#0a0812' }}>
          <img
            src={`/api/thumb/${video.id}`}
            alt={video.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/400x225/0A1428/7AD1B8?text=MBC' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,4,11,0.75) 0%, transparent 60%)' }} />
          {/* Play button */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.18s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: product.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlayIcon />
            </div>
          </div>
          {/* Badges */}
          {completed ? (
            <span style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
              color: '#4ADE80', borderRadius: 20, padding: '3px 10px',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              CONCLUÍDO
            </span>
          ) : (
            <span style={{
              position: 'absolute', top: 10, left: 10,
              background: `rgba(${product.colorRgb},0.18)`, border: `1px solid rgba(${product.colorRgb},0.3)`,
              color: product.color, borderRadius: 20, padding: '3px 10px',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            }}>
              NOVO
            </span>
          )}
          {/* Duration */}
          <span style={{
            position: 'absolute', bottom: 10, right: 10,
            background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '2px 7px',
            fontSize: 11, color: 'rgba(255,255,255,0.85)', fontFamily: '"Inter", sans-serif',
          }}>
            {video.duration}
          </span>
          {/* Progress bar */}
          {progress !== undefined && progress > 0 && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: product.color }} />
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: `rgba(${product.colorRgb},0.7)`, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, fontFamily: '"Inter", sans-serif', fontWeight: 600 }}>
            {video.cat}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f0ece8', fontFamily: '"Inter Tight", sans-serif', lineHeight: 1.4, marginBottom: 8 }}>
            {video.title}
          </div>
          {progress !== undefined && progress > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(240,236,232,0.4)', fontFamily: '"Inter", sans-serif' }}>
              {progress}% assistido
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function CoursePage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''

  const product = PRODUCT_CATALOG.find(p => p.id === slug)
  const videos = CATALOG.filter(v => v.productId === slug)

  const [wpMap, setWpMap] = useState<Record<string, number>>({})
  const [completedMap, setCompletedMap] = useState<Record<string, number>>({})
  // null = loading, true = has access, false = no access
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const wp = getWP()
    const completed = getCompleted()
    const pcts: Record<string, number> = {}
    for (const [id, entry] of Object.entries(wp)) {
      pcts[id] = Math.round(entry.progress * 100)
    }
    setWpMap(pcts)
    setCompletedMap(completed)

    // Check product access
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setHasAccess(false); return }
      const { data } = await supabase
        .from('user_products')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('product_id', slug)
        .eq('status', 'active')
        .maybeSingle()
      setHasAccess(!!data)
    }).catch(() => setHasAccess(false))
  }, [slug])

  if (!product) {
    return (
      <>
        <Sidebar />
        <div className="main-wrap">
          <Topbar />
          <main style={{ padding: '80px 40px', textAlign: 'center', color: '#555' }}>
            Curso não encontrado.{' '}
            <Link href="/" style={{ color: '#7AD1B8' }}>Voltar ao Hub</Link>
          </main>
        </div>
      </>
    )
  }

  // Still verifying access — show neutral loading state
  if (hasAccess === null) {
    return (
      <>
        <Sidebar />
        <div className="main-wrap">
          <Topbar />
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
            <div style={{ color: '#555', fontSize: 14, fontFamily: '"Inter", sans-serif', letterSpacing: '0.04em' }}>
              Verificando acesso...
            </div>
          </div>
        </div>
      </>
    )
  }

  // Access denied — show lock wall
  if (hasAccess === false) {
    return (
      <>
        <Sidebar />
        <div className="main-wrap">
          <Topbar />
          <div style={{
            minHeight: '80vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
            background: `radial-gradient(ellipse 60% 50% at 50% 40%, rgba(${product.colorRgb},0.05) 0%, transparent 70%)`,
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: `rgba(${product.colorRgb},0.08)`,
              border: `1px solid rgba(${product.colorRgb},0.2)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 24,
            }}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke={product.color} strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
              </svg>
            </div>
            <h2 style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 28, fontWeight: 800, color: product.color, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Acesso bloqueado
            </h2>
            <p style={{ color: 'rgba(240,236,232,0.4)', fontSize: 15, fontFamily: '"Inter", sans-serif', margin: '0 0 32px', textAlign: 'center', maxWidth: 380 }}>
              Você não tem acesso ao curso <strong style={{ color: 'rgba(240,236,232,0.7)' }}>{product.name}</strong>. Adquira o produto para liberar o conteúdo.
            </p>
            <Link href="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 12,
              background: `rgba(${product.colorRgb},0.12)`,
              border: `1px solid rgba(${product.colorRgb},0.25)`,
              color: product.color, fontWeight: 700, fontSize: 13,
              fontFamily: '"Inter", sans-serif', textDecoration: 'none',
              letterSpacing: '0.02em',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Voltar ao Hub
            </Link>
          </div>
        </div>
      </>
    )
  }

  const completedCount = videos.filter(v => v.id in completedMap).length

  return (
    <>
      <Sidebar />
      <div className="main-wrap">
        <Topbar />

        {/* ── HEADER ── */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          padding: '52px 48px 44px',
          background: `linear-gradient(145deg, rgba(${product.colorRgb},0.1) 0%, rgba(7,4,11,0.98) 55%)`,
          borderBottom: `1px solid rgba(${product.colorRgb},0.12)`,
        }}>
          {/* Noise grain */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.025, pointerEvents: 'none' }}>
            <filter id="grain2"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
            <rect width="100%" height="100%" filter="url(#grain2)" />
          </svg>
          {/* Radial glow */}
          <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, rgba(${product.colorRgb},0.08) 0%, transparent 70%)`, pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <Link href="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'rgba(240,236,232,0.4)', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.06em', textDecoration: 'none',
              textTransform: 'uppercase', fontFamily: '"Inter", sans-serif',
              marginBottom: 24,
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = product.color)}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,232,0.4)')}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Hub
            </Link>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                  color: `rgba(${product.colorRgb},0.65)`, textTransform: 'uppercase',
                  marginBottom: 8, fontFamily: '"Inter", sans-serif',
                }}>
                  CURSO
                </div>
                <h1 style={{
                  margin: '0 0 6px', fontSize: 48, fontWeight: 900,
                  fontFamily: '"Inter Tight", sans-serif',
                  color: product.color, letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  {product.name}
                </h1>
                <p style={{ margin: 0, fontSize: 16, color: 'rgba(240,236,232,0.45)', fontFamily: '"Inter", sans-serif' }}>
                  {product.fullName}
                </p>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 24, marginLeft: 'auto' }}>
                {[
                  { label: 'Vídeos', value: videos.length > 0 ? String(videos.length) : '—' },
                  { label: 'Concluídos', value: `${completedCount}/${videos.length}` },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: product.color, fontFamily: '"Inter Tight", sans-serif', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(240,236,232,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"Inter", sans-serif', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar (if has videos) */}
            {videos.length > 0 && (
              <div style={{ marginTop: 28, maxWidth: 400 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'rgba(240,236,232,0.35)', fontFamily: '"Inter", sans-serif', letterSpacing: '0.05em' }}>PROGRESSO DO CURSO</span>
                  <span style={{ fontSize: 11, color: product.color, fontFamily: '"Inter", sans-serif', fontWeight: 600 }}>
                    {Math.round((completedCount / videos.length) * 100)}%
                  </span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${Math.round((completedCount / videos.length) * 100)}%`,
                    background: product.color,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <main style={{ padding: '40px 48px 80px' }}>
          {videos.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              border: `1px dashed rgba(${product.colorRgb},0.18)`,
              borderRadius: 20,
            }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>🎬</div>
              <h2 style={{ color: product.color, fontFamily: '"Inter Tight", sans-serif', fontSize: 24, margin: '0 0 8px' }}>
                Em breve
              </h2>
              <p style={{ color: 'rgba(240,236,232,0.35)', fontFamily: '"Inter", sans-serif', fontSize: 14, margin: 0 }}>
                Os vídeos deste curso serão disponibilizados em breve.
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 3, height: 20, background: product.color, borderRadius: 2 }} />
                <span style={{ fontSize: 18, fontWeight: 700, color: '#f0ece8', fontFamily: '"Inter Tight", sans-serif' }}>
                  Todos os Vídeos
                </span>
                <span style={{
                  background: `rgba(${product.colorRgb},0.12)`,
                  border: `1px solid rgba(${product.colorRgb},0.22)`,
                  color: product.color, borderRadius: 20, padding: '2px 10px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                }}>
                  {videos.length}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {videos.map(v => (
                  <VideoCard
                    key={v.id}
                    video={v}
                    product={product}
                    progress={wpMap[v.id]}
                    completed={v.id in completedMap}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
