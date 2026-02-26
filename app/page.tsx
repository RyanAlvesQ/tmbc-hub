'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { CATALOG, PRODUCT_CATALOG } from '@/lib/catalog'
import { getWP, getCompleted, getFavs, setFavs } from '@/lib/storage'
import { createClient } from '@/lib/supabase/client'
import type { Video } from '@/types'

const PlayIcon = () => (
  <svg width="20" height="20" fill="#050810" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
)

interface VideoCardProps {
  video: Video
  badge?: React.ReactNode
  progress?: number
  wide?: boolean
}

function VideoCard({ video, badge, progress, wide }: VideoCardProps) {
  const thumb = `/api/thumb/${video.id}`
  return (
    <Link href={`/player?v=${video.id}`} style={{ textDecoration: 'none' }}>
      <div className={`vcard${wide ? ' vcard-wide' : ''}`}>
        <div className="vcard-thumb">
          <img
            src={thumb}
            alt={video.title}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/280x157/0A1428/7AD1B8?text=MBC' }}
          />
          <div className="vcard-overlay">
            <button className="play-btn"><PlayIcon /></button>
          </div>
          {badge}
          {video.duration && <span className="vcard-duration">{video.duration}</span>}
          {progress !== undefined && (
            <div className="vcard-progress">
              <div className="vcard-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <div className="vcard-body">
          <div className="vcard-cat">{video.cat}</div>
          <div className="vcard-title">{video.title}</div>
          <div className="vcard-meta">
            <span className="vcard-meta-item">
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l2 2" strokeLinecap="round" /></svg>
              {progress !== undefined ? `${progress}% assistido` : video.duration}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}


export default function HubPage() {
  const [heroInd, setHeroInd] = useState(0)
  // null = still loading, string[] = loaded (may be empty)
  const [accessibleProducts, setAccessibleProducts] = useState<string[] | null>(null)
  const [watchedCount, setWatchedCount] = useState(0)
  const [inProgressCount, setInProgressCount] = useState(0)
  const [continueVideos, setContinueVideos] = useState<Array<Video & { pct: number }>>([])
  const [lastVideo, setLastVideo] = useState<Video | null>(null)
  const [heroFaved, setHeroFaved] = useState(false)
  const [completedMap, setCompletedMap] = useState<Record<string, number>>({})

  useEffect(() => {
    const wp = getWP()
    const completed = getCompleted()
    const favs = getFavs()
    setCompletedMap(completed)

    const completedCount = Object.keys(completed).length
    setWatchedCount(completedCount)

    const inProgress = CATALOG
      .filter(v => wp[v.id] && !(v.id in completed))
      .sort((a, b) => (wp[b.id]?.lastWatched || 0) - (wp[a.id]?.lastWatched || 0))

    setInProgressCount(inProgress.length)
    setContinueVideos(inProgress.map(v => ({
      ...v,
      pct: Math.round(wp[v.id].progress * 100),
    })))

    // Find last interacted video for hero buttons
    const allInteractions = [
      ...Object.entries(wp).map(([id, d]) => ({ id, ts: d.lastWatched || 0 })),
      ...Object.entries(completed).map(([id, ts]) => ({ id, ts: ts as number })),
    ].filter(x => CATALOG.find(v => v.id === x.id))
    allInteractions.sort((a, b) => b.ts - a.ts)

    if (allInteractions[0]) {
      const vid = CATALOG.find(v => v.id === allInteractions[0].id) || null
      setLastVideo(vid)
      if (vid) setHeroFaved(favs.includes(vid.id))
    }

    // Fetch which products this user has active access to
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAccessibleProducts([]); return }
      const { data } = await supabase
        .from('user_products')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
      setAccessibleProducts((data ?? []).map((r: { product_id: string }) => r.product_id))
    }).catch(() => setAccessibleProducts([]))
  }, [])

  const toggleHeroFav = () => {
    if (!lastVideo) return
    const favs = getFavs()
    const idx = favs.indexOf(lastVideo.id)
    if (idx >= 0) favs.splice(idx, 1); else favs.push(lastVideo.id)
    setFavs(favs)
    setHeroFaved(favs.includes(lastVideo.id))
  }

  return (
    <>
      <Sidebar />
      <div className="main-wrap">
        <Topbar />

        {/* ── HERO ── */}
        <section className="hero">
          {/* Cinematic background */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 80% at 75% 30%, #001E4D 0%, transparent 65%), radial-gradient(ellipse 45% 55% at 78% 55%, #003866 0%, transparent 55%), radial-gradient(ellipse 30% 40% at 85% 20%, rgba(0,212,200,.18) 0%, transparent 50%), radial-gradient(ellipse 60% 70% at 15% 80%, rgba(0,212,200,.06) 0%, transparent 60%), linear-gradient(145deg, #07090F 0%, #0A1428 40%, #080F1F 70%, #07090F 100%)' }} />

          {/* Decorative grid */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(71,181,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(71,181,255,.025) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 70% at 70% 40%, black 30%, transparent 80%)' }} />

          {/* Abstract chart bars */}
          <div style={{ position: 'absolute', right: 120, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'flex-end', gap: 8, opacity: .18 }}>
            {[180, 240, 120, 290, 200, 160, 310, 250, 140].map((h, i) => (
              <div key={i} style={{ width: 14, height: h, background: `linear-gradient(180deg,${['var(--blue)', 'var(--teal)', 'var(--blue)', 'var(--teal)', 'var(--blue)', 'var(--orange)', 'var(--teal)', 'var(--blue)', 'var(--orange)'][i]},transparent)`, borderRadius: '3px 3px 0 0' }} />
            ))}
          </div>

          {/* Floating metrics */}
          <div style={{ position: 'absolute', right: 80, top: '50%', transform: 'translateY(-60%)', display: 'flex', flexDirection: 'column', gap: 14, opacity: .85 }}>
            <div style={{ background: 'rgba(11,17,34,.85)', border: '1px solid rgba(0,212,200,.15)', borderRadius: 10, padding: '16px 20px', backdropFilter: 'blur(12px)', minWidth: 200 }}>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 9, letterSpacing: '.14em', color: 'var(--teal)', marginBottom: 8 }}>ROAS ATUAL</div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>4.7<span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 2 }}>x</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#4ADE80', fontFamily: "'Roboto Mono', monospace" }}>▲ +0.8</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: "'Roboto Mono', monospace" }}>vs semana ant.</span>
              </div>
            </div>
            <div style={{ background: 'rgba(11,17,34,.85)', border: '1px solid rgba(71,181,255,.1)', borderRadius: 10, padding: '16px 20px', backdropFilter: 'blur(12px)' }}>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 9, letterSpacing: '.14em', color: 'var(--blue)', marginBottom: 8 }}>CPM MÉDIO</div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>R$<span style={{ fontSize: 22 }}>18</span><span style={{ fontSize: 14, color: 'var(--text-muted)' }}>.40</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#F87171', fontFamily: "'Roboto Mono', monospace" }}>▼ -2.1</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: "'Roboto Mono', monospace" }}>vs semana ant.</span>
              </div>
            </div>
          </div>

          {/* Bottom/Left gradients */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(7,9,15,.6) 70%, var(--dark-bg) 100%)', zIndex: 3 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(7,9,15,.85) 0%, rgba(7,9,15,.4) 45%, transparent 65%)', zIndex: 3 }} />

          {/* Hero content */}
          <div className="hero-content">
            <div className="hero-badge fade-up">
              <div className="hero-badge-dot" />
              EM DESTAQUE ESTA SEMANA
            </div>
            <h1 className="hero-title fade-up fade-up-1">
              Blueprint de Anúncios<br />
              <span className="glow">7 Dígitos</span> no Meta
            </h1>
            <div className="hero-meta fade-up fade-up-2">
              <span className="hero-match">97% relevante para você</span>
              <span className="hero-meta-sep">·</span>
              <span className="hero-meta-tag">2h 48min</span>
              <span className="hero-meta-sep">·</span>
              <span className="hero-meta-tag">12 módulos</span>
              <span className="hero-meta-sep">·</span>
              <span className="hero-meta-tag">AVANÇADO</span>
            </div>
            <p className="hero-desc fade-up fade-up-2">
              Descubra a estrutura exata de campanhas que escalou múltiplas contas de e-commerce para R$100k/mês. Do criativo à segmentação, cada decisão explicada com dados reais.
            </p>
            <div className="hero-actions fade-up fade-up-3">
              {lastVideo && (
                <Link className="btn-primary" href={`/player?v=${lastVideo.id}`}>
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
                  CONTINUAR ASSISTINDO
                </Link>
              )}
              {lastVideo && (
                <button
                  className="btn-secondary"
                  onClick={toggleHeroFav}
                  style={{ padding: '13px 16px', color: heroFaved ? 'var(--orange)' : undefined, borderColor: heroFaved ? 'rgba(245,166,35,.35)' : undefined, background: heroFaved ? 'rgba(245,166,35,.1)' : undefined }}
                >
                  <svg width="14" height="14" fill={heroFaved ? 'var(--orange)' : 'none'} viewBox="0 0 24 24" stroke={heroFaved ? 'var(--orange)' : 'currentColor'} strokeWidth="2.2">
                    <path d="M12 21l-7.5-7.2A5 5 0 0 1 12 6.5a5 5 0 0 1 7.5 7.3L12 21z" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Progress & Indicators */}
          <div className="hero-progress-wrap fade-up fade-up-4">
            <div className="hero-progress-label">PROGRESSO DO MÓDULO · AULA 4 DE 12</div>
            <div className="hero-progress-bar-wrap">
              <div className="hero-progress-bar" />
            </div>
            <div className="hero-indicators">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`hero-ind${heroInd === i ? ' active' : ''}`} onClick={() => setHeroInd(i)} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTENT AREA ── */}
        <main className="content-area">

          {/* Stats strip */}
          <div className="stats-strip">
            <div className="stat-item">
              <span className="stat-label">VÍDEOS ASSISTIDOS</span>
              <span className="stat-value">{String(watchedCount).padStart(2, '0')}</span>
              <span className="stat-sub">
                {watchedCount === 0
                  ? <span style={{ color: 'rgba(232,237,245,.4)' }}>nenhum ainda</span>
                  : <span style={{ color: 'rgba(232,237,245,.5)' }}>{watchedCount} concluído{watchedCount !== 1 ? 's' : ''}</span>
                }
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">EM PROGRESSO</span>
              <span className="stat-value">{String(inProgressCount).padStart(2, '0')}</span>
              <span className="stat-sub">
                {inProgressCount === 0
                  ? <span style={{ color: 'rgba(232,237,245,.4)' }}>nenhum em andamento</span>
                  : <><span className="teal">{inProgressCount}</span> vídeo{inProgressCount !== 1 ? 's' : ''} em andamento</>
                }
              </span>
            </div>
          </div>

          {/* Continue Watching */}
          {continueVideos.length > 0 && (
            <div className="row-section">
              <div className="row-header">
                <div className="row-title-wrap">
                  <div className="row-accent" style={{ background: 'linear-gradient(180deg, var(--teal), var(--blue))' }} />
                  <span className="row-title">Continue Assistindo</span>
                  <span className="row-tag" style={{ background: 'rgba(0,212,200,.1)', color: 'var(--teal)', border: '1px solid rgba(0,212,200,.2)' }}>{continueVideos.length} EM ANDAMENTO</span>
                </div>
              </div>
              <div className="cards-scroll">
                {continueVideos.map(v => (
                  <VideoCard key={v.id} video={v} progress={v.pct} wide />
                ))}
              </div>
            </div>
          )}

          {/* ── MEUS CURSOS ── */}
          <div className="row-section">
            <div className="row-header">
              <div className="row-title-wrap">
                <div className="row-accent" style={{ background: 'linear-gradient(180deg, var(--teal), var(--blue))' }} />
                <span className="row-title">Meus Cursos</span>
                <span className="row-tag" style={{ background: 'rgba(0,212,200,.1)', color: 'var(--teal)', border: '1px solid rgba(0,212,200,.2)' }}>3 CURSOS</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 450px))', gap: 16, padding: '0 64px' }}>
              {PRODUCT_CATALOG.map(product => {
                const videos = CATALOG.filter(v => v.productId === product.id)
                const previewVideo = videos[0] ?? null
                const completedCount = videos.filter(v => v.id in completedMap).length
                // null = still loading, true/false = determined
                const isLoading = accessibleProducts === null
                const hasAccess = isLoading ? null : accessibleProducts.includes(product.id)
                const locked = hasAccess === false

                const cardInner = (
                  <div
                    style={{
                      borderRadius: 16,
                      border: locked || isLoading
                        ? '1px solid rgba(255,255,255,0.06)'
                        : `1px solid rgba(${product.colorRgb},0.22)`,
                      background: locked || isLoading
                        ? 'rgba(255,255,255,0.02)'
                        : `linear-gradient(145deg, rgba(${product.colorRgb},0.07) 0%, rgba(7,4,11,0.95) 60%)`,
                      overflow: 'hidden',
                      cursor: locked ? 'not-allowed' : isLoading ? 'default' : 'pointer',
                      transition: locked || isLoading ? 'none' : 'transform 0.2s, box-shadow 0.2s',
                      boxShadow: locked || isLoading ? 'none' : `0 4px 32px rgba(${product.colorRgb},0.08)`,
                      opacity: locked ? 0.75 : isLoading ? 0.45 : 1,
                    }}
                    onMouseEnter={e => {
                      if (locked || isLoading) return
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = `0 16px 48px rgba(${product.colorRgb},0.2)`
                    }}
                    onMouseLeave={e => {
                      if (locked || isLoading) return
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = `0 4px 32px rgba(${product.colorRgb},0.08)`
                    }}
                  >
                    {/* Thumbnail area */}
                    <div style={{ position: 'relative', width: '100%', paddingBottom: '48%', background: 'rgba(255,255,255,0.03)' }}>
                      {previewVideo ? (
                        <img
                          src={`/api/thumb/${previewVideo.id}`}
                          alt={product.name}
                          style={{
                            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                            opacity: locked ? 0.15 : isLoading ? 0.2 : 0.7,
                            filter: locked || isLoading ? 'grayscale(1) blur(2px)' : 'none',
                          }}
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : null}
                      {/* Overlay */}
                      <div style={{ position: 'absolute', inset: 0, background: locked || isLoading ? 'rgba(7,4,11,0.7)' : `linear-gradient(to top, rgba(7,4,11,0.95) 0%, rgba(7,4,11,0.3) 50%, transparent 100%)` }} />

                      {/* LOCKED: padlock centred */}
                      {locked && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
                            </svg>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', fontFamily: '"Inter", sans-serif', textTransform: 'uppercase' }}>
                            Sem acesso
                          </span>
                        </div>
                      )}

                      {/* UNLOCKED: accent bar + count badge + play hint */}
                      {!locked && !isLoading && (
                        <>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: product.color, opacity: 0.85 }} />
                          <div style={{
                            position: 'absolute', top: 12, right: 12,
                            background: `rgba(${product.colorRgb},0.2)`,
                            border: `1px solid rgba(${product.colorRgb},0.35)`,
                            borderRadius: 20, padding: '3px 10px',
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                            color: product.color, backdropFilter: 'blur(8px)',
                            fontFamily: '"Inter", sans-serif',
                          }}>
                            {videos.length > 0 ? `${videos.length} VÍDEO${videos.length !== 1 ? 'S' : ''}` : 'EM BREVE'}
                          </div>
                          {previewVideo && (
                            <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: product.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="10" height="10" fill="#07040B" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
                              </div>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: '"Inter", sans-serif' }}>{previewVideo.duration}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '14px 16px 16px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: locked || isLoading ? 'rgba(255,255,255,0.2)' : `rgba(${product.colorRgb},0.7)`, textTransform: 'uppercase', marginBottom: 6, fontFamily: '"Inter", sans-serif' }}>
                        CURSO
                      </div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, fontFamily: '"Inter Tight", sans-serif', color: locked || isLoading ? 'rgba(255,255,255,0.25)' : product.color, letterSpacing: '-0.02em' }}>
                        {product.name}
                      </h3>
                      <p style={{ margin: '0 0 14px', fontSize: 12, color: locked || isLoading ? 'rgba(240,236,232,0.2)' : 'rgba(240,236,232,0.45)', fontFamily: '"Inter", sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.fullName}
                      </p>
                      {isLoading ? null : locked ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: '"Inter", sans-serif' }}>
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" /></svg>
                          Acesso não adquirido
                        </span>
                      ) : videos.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, color: 'rgba(240,236,232,0.4)', fontFamily: '"Inter", sans-serif' }}>{completedCount}/{videos.length} concluídos</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: product.color, fontFamily: '"Inter", sans-serif', letterSpacing: '0.02em' }}>
                            Acessar
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'rgba(240,236,232,0.3)', fontFamily: '"Inter", sans-serif' }}>Conteúdo em breve</span>
                      )}
                    </div>
                  </div>
                )

                return locked || isLoading
                  ? <div key={product.id}>{cardInner}</div>
                  : <Link key={product.id} href={`/curso/${product.id}`} style={{ textDecoration: 'none' }}>{cardInner}</Link>
              })}
            </div>
          </div>

        </main>
      </div>
    </>
  )
}
