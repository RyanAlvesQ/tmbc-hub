'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { CATALOG } from '@/lib/catalog'
import { getWP, getCompleted, getFavs, setFavs } from '@/lib/storage'
import type { Video } from '@/types'

const PlayIcon = () => (
  <svg width="20" height="20" fill="#050810" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
)
const ClockIcon = () => (
  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><path d="M12 8v4l2 2" strokeLinecap="round" />
  </svg>
)

interface VideoCardProps {
  video: Video
  badge?: React.ReactNode
  progress?: number
  wide?: boolean
}

function VideoCard({ video, badge, progress, wide }: VideoCardProps) {
  const thumb = `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`
  const fallback = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`
  return (
    <Link href={`/player?v=${video.id}`} style={{ textDecoration: 'none' }}>
      <div className={`vcard${wide ? ' vcard-wide' : ''}`}>
        <div className="vcard-thumb">
          <img
            src={thumb}
            alt={video.title}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback }}
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
              <ClockIcon />
              {progress !== undefined ? `${progress}% assistido` : video.duration}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function scrollRow(id: string, dir: number) {
  const el = document.getElementById(id)
  if (el) el.scrollBy({ left: dir * 620, behavior: 'smooth' })
}

export default function HubPage() {
  const [activeChip, setActiveChip] = useState('Todos')
  const [heroInd, setHeroInd] = useState(0)
  const [watchedCount, setWatchedCount] = useState(0)
  const [inProgressCount, setInProgressCount] = useState(0)
  const [continueVideos, setContinueVideos] = useState<Array<Video & { pct: number }>>([])
  const [lastVideo, setLastVideo] = useState<Video | null>(null)
  const [heroFaved, setHeroFaved] = useState(false)

  useEffect(() => {
    const wp = getWP()
    const completed = getCompleted()
    const favs = getFavs()

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
  }, [])

  const toggleHeroFav = () => {
    if (!lastVideo) return
    const favs = getFavs()
    const idx = favs.indexOf(lastVideo.id)
    if (idx >= 0) favs.splice(idx, 1); else favs.push(lastVideo.id)
    setFavs(favs)
    setHeroFaved(favs.includes(lastVideo.id))
  }

  const cats = ['Todos', 'Meta Ads', 'Google Ads', 'Analytics & Dados', 'Creative Strategy', 'TikTok Ads', 'E-commerce', 'Funis & CRO']
  const catColors: Record<string, string> = {
    'Todos': 'var(--teal)',
    'Meta Ads': '#47B5FF',
    'Google Ads': '#F5A623',
    'Analytics & Dados': '#A78BFA',
    'Creative Strategy': '#34D399',
    'TikTok Ads': '#F87171',
    'E-commerce': '#60A5FA',
    'Funis & CRO': '#FBBF24',
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

          {/* Category chips */}
          <div className="cat-chips">
            {cats.map(cat => (
              <div
                key={cat}
                className={`cat-chip${activeChip === cat ? ' active' : ''}`}
                onClick={() => setActiveChip(cat)}
              >
                <span className="cat-chip-dot" style={{ background: catColors[cat] }} />
                {cat}
              </div>
            ))}
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

          {/* Novos Vídeos */}
          <div className="row-section" id="section-novos-videos">
            <div className="row-header">
              <div className="row-title-wrap">
                <div className="row-accent" style={{ background: 'linear-gradient(180deg, var(--teal), var(--blue))' }} />
                <span className="row-title">Novos Vídeos</span>
                <span className="row-tag" style={{ background: 'rgba(0,212,200,.1)', color: 'var(--teal)', border: '1px solid rgba(0,212,200,.2)' }}>{CATALOG.length} NOVOS</span>
              </div>
            </div>
            <div className="cards-scroll">
              {CATALOG.map(v => {
                const completed = getCompleted()
                const isDone = v.id in completed
                return (
                  <VideoCard
                    key={v.id}
                    video={v}
                    wide
                    badge={isDone
                      ? <span className="vcard-badge" style={{ background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.3)', color: '#4ADE80', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          CONCLUÍDO
                        </span>
                      : <span className="vcard-badge badge-new">NOVO</span>
                    }
                  />
                )
              })}
            </div>
          </div>

          {/* Row 2: Em Alta */}
          <div className="row-section">
            <div className="row-header">
              <div className="row-title-wrap">
                <div className="row-accent" style={{ background: 'linear-gradient(180deg, var(--orange), #FF6B35)' }} />
                <span className="row-title">Em Alta na Comunidade</span>
                <span className="row-tag" style={{ background: 'rgba(245,166,35,.1)', color: 'var(--orange)', border: '1px solid rgba(245,166,35,.2)' }}>🔥 TRENDING</span>
              </div>
              <a className="row-see-all" href="#">
                VER TUDO
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            </div>
            <div className="row-nav-wrap">
              <button className="scroll-arrow left" onClick={() => scrollRow('row2', -1)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="cards-scroll" id="row2">
                {[
                  { src: 'https://placehold.co/280x157/0A1428/47B5FF?text=Broad+Targeting', badge: 'EM ALTA', badgeCls: 'badge-hot', cat: 'Meta Ads', title: 'Broad Targeting em 2025: Por que Funciona', duration: '1:05:20', views: '4.2k visualizações' },
                  { src: 'https://placehold.co/280x157/0D1A0A/34D399?text=VSL+Copywriting', badge: 'NOVO', badgeCls: 'badge-new', cat: 'Creative Strategy', title: 'VSL de Alta Conversão: Script Completo', duration: '2:15:00', views: '3.8k visualizações' },
                  { src: 'https://placehold.co/280x157/1A1000/F5A623?text=ROAS+Escalada', badge: 'EM ALTA', badgeCls: 'badge-hot', cat: 'Meta Ads · E-commerce', title: 'Escalando ROAS sem Perder Eficiência', duration: '1:44:35', views: '6.1k visualizações' },
                  { src: 'https://placehold.co/280x157/120D1E/A78BFA?text=TikTok+Ads', badge: null, badgeCls: '', cat: 'TikTok Ads', title: 'TikTok Spark Ads: Estratégia Completa', duration: '0:52:10', views: '2.9k visualizações' },
                  { src: 'https://placehold.co/280x157/0A1A18/00D4C8?text=Lookalike+2025', badge: 'EXCLUSIVO', badgeCls: 'badge-excl', cat: 'Meta Ads · Avançado', title: 'Lookalikes em 2025: Ainda Valem a Pena?', duration: '1:18:45', views: '5.4k visualizações' },
                ].map((c, i) => (
                  <div className="vcard" key={i}>
                    <div className="vcard-thumb">
                      <img src={c.src} alt="" />
                      <div className="vcard-overlay"><button className="play-btn"><PlayIcon /></button></div>
                      {c.badge && <span className={`vcard-badge ${c.badgeCls}`}>{c.badge}</span>}
                      <span className="vcard-duration">{c.duration}</span>
                    </div>
                    <div className="vcard-body">
                      <div className="vcard-cat">{c.cat}</div>
                      <div className="vcard-title">{c.title}</div>
                      <div className="vcard-meta">
                        <span className="vcard-meta-item">
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          {c.views}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="scroll-arrow right" onClick={() => scrollRow('row2', 1)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>

          {/* Row 3: Ao Vivo */}
          <div className="row-section">
            <div className="row-header">
              <div className="row-title-wrap">
                <div className="row-accent" style={{ background: 'linear-gradient(180deg, #F87171, #DC2626)' }} />
                <span className="row-title">Ao Vivo & Gravações Recentes</span>
                <span className="row-tag badge-live" style={{ border: '1px solid rgba(248,113,113,.3)' }}>
                  <span className="badge-live-dot" style={{ background: '#F87171' }} />
                  AO VIVO AGORA
                </span>
              </div>
              <a className="row-see-all" href="#">VER TUDO <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
            </div>
            <div className="cards-scroll" id="row3">
              <div className="featured-card">
                <div className="vcard-thumb">
                  <img src="https://placehold.co/480x206/0A1428/47B5FF?text=Q%26A+Ao+Vivo+Agora" alt="Live" style={{ filter: 'saturate(.7)' }} />
                  <div className="vcard-overlay" style={{ opacity: 1, background: 'linear-gradient(180deg, transparent 20%, rgba(7,9,15,.75) 100%)' }} />
                  <span className="vcard-badge badge-live" style={{ display: 'flex', border: '1px solid rgba(248,113,113,.3)' }}>
                    <span className="badge-live-dot" style={{ background: '#F87171' }} />
                    AO VIVO · 312 ASSISTINDO
                  </span>
                  <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 5 }}>
                    <div style={{ fontFamily: "'Roboto Mono',monospace", fontSize: 9, letterSpacing: '.12em', color: 'rgba(248,113,113,.9)', marginBottom: 6 }}>SESSÃO DE PERGUNTAS</div>
                    <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Q&A: Estratégias de Escala para Q3 2025</div>
                    <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 11 }}>
                      <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8z" fill="#050810" /></svg>
                      ENTRAR NA TRANSMISSÃO
                    </button>
                  </div>
                </div>
              </div>
              {[
                { src: 'https://placehold.co/280x157/0A1428/47B5FF?text=Gravação+Semana+Passada', cat: 'Live Semanal · 14 Fev', title: 'Análise de Contas ao Vivo: Onde estão os Vazamentos', duration: '1:32:00', views: '1.7k views' },
                { src: 'https://placehold.co/280x157/0D1A0A/34D399?text=Workshop+Copy', cat: 'Workshop · 7 Fev', title: 'Workshop de Copywriting para Anúncios de Produto', duration: '2:05:00', views: '2.3k views' },
              ].map((c, i) => (
                <div className="vcard" key={i}>
                  <div className="vcard-thumb">
                    <img src={c.src} alt="" />
                    <div className="vcard-overlay"><button className="play-btn"><PlayIcon /></button></div>
                    <span className="vcard-badge" style={{ background: 'rgba(100,100,100,.5)', color: 'rgba(255,255,255,.7)', fontFamily: "'Roboto Mono',monospace", fontSize: 8, letterSpacing: '.1em' }}>GRAVADO</span>
                    <span className="vcard-duration">{c.duration}</span>
                  </div>
                  <div className="vcard-body">
                    <div className="vcard-cat">{c.cat}</div>
                    <div className="vcard-title">{c.title}</div>
                    <div className="vcard-meta">
                      <span className="vcard-meta-item">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        {c.views}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructor Strip */}
          <div className="instructor-strip">
            <img className="instructor-avatar" src="https://placehold.co/72x72/001E4D/47B5FF?text=MBC" alt="Instrutor" />
            <div className="instructor-info">
              <div className="instructor-name">Rafael Mendes</div>
              <div className="instructor-role">LEAD INSTRUCTOR · MEDIA BUYER CLUB</div>
              <div className="instructor-desc">Mais de 10 anos escalando campanhas de mídia paga para marcas de 8 dígitos. Gerenciou mais de R$50M em budget de ads nos últimos 3 anos.</div>
            </div>
            <div className="instructor-stats">
              <div className="inst-stat"><span className="inst-stat-val">142</span><span className="inst-stat-lbl">AULAS</span></div>
              <div className="inst-stat"><span className="inst-stat-val">8.4k</span><span className="inst-stat-lbl">ALUNOS</span></div>
              <div className="inst-stat"><span className="inst-stat-val">4.9</span><span className="inst-stat-lbl">AVALIAÇÃO</span></div>
            </div>
          </div>

          {/* Row 4: Meta Ads Mastery */}
          <div className="row-section">
            <div className="row-header">
              <div className="row-title-wrap">
                <div className="row-accent" style={{ background: 'linear-gradient(180deg, #47B5FF, #004098)' }} />
                <span className="row-title">Meta Ads Mastery</span>
              </div>
              <a className="row-see-all" href="#">VER TUDO <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
            </div>
            <div className="row-nav-wrap">
              <button className="scroll-arrow left" onClick={() => scrollRow('row4', -1)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="cards-scroll" id="row4">
                {[
                  { src: 'https://placehold.co/280x157/08101E/47B5FF?text=Advantage++', badge: 'NOVO', badgeCls: 'badge-new', cat: 'Meta Ads · Intermediário', title: 'Advantage++ Shopping: Tudo que Você Precisa Saber', duration: '0:48:30' },
                  { src: 'https://placehold.co/280x157/0A1428/6B9EFF?text=CBO+vs+ABO', badge: null, badgeCls: '', cat: 'Meta Ads · Iniciante', title: 'CBO vs ABO: Qual Usar e Quando Mudar', duration: '1:12:00' },
                  { src: 'https://placehold.co/280x157/071428/3B82F6?text=Pixel+Avan%C3%A7ado', badge: 'EXCLUSIVO', badgeCls: 'badge-excl', cat: 'Meta Ads · Avançado', title: 'Pixel Meta Avançado: Eventos Customizados & CAPI', duration: '1:55:15' },
                  { src: 'https://placehold.co/280x157/091426/2563EB?text=Retargeting', badge: null, badgeCls: '', cat: 'Meta Ads · Intermediário', title: 'Retargeting Inteligente: Segmentação por Comportamento', duration: '0:36:40' },
                  { src: 'https://placehold.co/280x157/080E1E/60A5FA?text=DPA+Catalogo', badge: 'EM ALTA', badgeCls: 'badge-hot', cat: 'Meta Ads · E-commerce', title: 'DPA & Catálogo: Otimização para E-commerce', duration: '1:08:20' },
                ].map((c, i) => (
                  <div className="vcard" key={i}>
                    <div className="vcard-thumb">
                      <img src={c.src} alt="" />
                      <div className="vcard-overlay"><button className="play-btn"><PlayIcon /></button></div>
                      {c.badge && <span className={`vcard-badge ${c.badgeCls}`}>{c.badge}</span>}
                      <span className="vcard-duration">{c.duration}</span>
                    </div>
                    <div className="vcard-body">
                      <div className="vcard-cat">{c.cat}</div>
                      <div className="vcard-title">{c.title}</div>
                      <div className="vcard-meta">
                        <span className="vcard-meta-item">
                          <ClockIcon />
                          {c.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="scroll-arrow right" onClick={() => scrollRow('row4', 1)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>

        </main>
      </div>
    </>
  )
}
