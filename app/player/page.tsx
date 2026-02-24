'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { CATALOG } from '@/lib/catalog'
import { getFavs, setFavs, getWP, setWP, getCompleted, markCompleted } from '@/lib/storage'

// YouTube IFrame API type declarations
declare global {
  interface Window {
    YT: {
      Player: new (id: string, opts: Record<string, unknown>) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTPlayer {
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

function PlayerInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // videoId is an opaque slug (e.g. "v1") — never the YouTube ID
  const videoId = searchParams.get('v') || CATALOG[0].id
  const currentIndex = CATALOG.findIndex(v => v.id === videoId)
  const meta = currentIndex >= 0 ? CATALOG[currentIndex] : CATALOG[0]

  const [isSaved, setIsSaved] = useState(false)
  const [showCompletedBanner, setShowCompletedBanner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [youtubeId, setYoutubeId] = useState<string | null>(null)

  const ytPlayerRef = useRef<YTPlayer | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setIsSaved(getFavs().includes(videoId))
    setShowCompletedBanner(videoId in getCompleted())
  }, [videoId])

  // Fetch the real YouTube ID server-side — never bundled into the client
  useEffect(() => {
    setYoutubeId(null)
    setLoading(true)
    fetch(`/api/video/${videoId}`)
      .then(r => r.json())
      .then(data => { if (data.youtubeId) setYoutubeId(data.youtubeId) })
      .catch(() => {})
  }, [videoId])

  // Only initialise the YT player once we have the YouTube ID
  useEffect(() => {
    if (!youtubeId) return

    const savedWP = getWP()[videoId]
    const startSeconds = savedWP ? Math.floor(savedWP.currentTime) : 0

    const saveProgress = () => {
      const player = ytPlayerRef.current
      if (!player || typeof player.getCurrentTime !== 'function') return
      const currentTime = player.getCurrentTime()
      const duration = player.getDuration()
      if (!duration || currentTime < 30) return
      const progress = currentTime / duration
      const wp = getWP()
      if (progress >= 0.95) {
        delete wp[videoId]
      } else {
        wp[videoId] = { currentTime, duration, progress, lastWatched: Date.now() }
      }
      setWP(wp)
    }

    window.onYouTubeIframeAPIReady = () => {
      ytPlayerRef.current = new window.YT.Player('yt-player', {
        videoId: youtubeId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, color: 'white', start: startSeconds },
        events: {
          onReady: () => setLoading(false),
          onStateChange: (e: { data: number }) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              if (!progressIntervalRef.current) {
                progressIntervalRef.current = setInterval(saveProgress, 5000)
              }
            } else if (e.data === window.YT.PlayerState.PAUSED) {
              saveProgress()
            } else if (e.data === window.YT.PlayerState.ENDED) {
              if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
              progressIntervalRef.current = null
              const wp = getWP()
              delete wp[videoId]
              setWP(wp)
              markCompleted(videoId)
              setShowCompletedBanner(true)
            }
          },
        },
      })
    }

    const handleUnload = () => saveProgress()
    window.addEventListener('pagehide', handleUnload)
    window.addEventListener('beforeunload', handleUnload)

    // Load YT script if not already loaded
    if (!document.getElementById('yt-api-script')) {
      const tag = document.createElement('script')
      tag.id = 'yt-api-script'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    } else if (window.YT && window.YT.Player) {
      window.onYouTubeIframeAPIReady()
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      window.removeEventListener('pagehide', handleUnload)
      window.removeEventListener('beforeunload', handleUnload)
      if (ytPlayerRef.current) { ytPlayerRef.current.destroy(); ytPlayerRef.current = null }
    }
  }, [youtubeId, videoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSave = () => {
    const favs = getFavs()
    const idx = favs.indexOf(videoId)
    if (idx >= 0) favs.splice(idx, 1); else favs.push(videoId)
    setFavs(favs)
    setIsSaved(favs.includes(videoId))
  }

  const completedData = getCompleted()

  return (
    <>
      <Sidebar />
      <div className="main-wrap">
        {/* Topbar */}
        <header className="topbar always-scrolled" style={{ background: 'rgba(7,9,15,.92)', backdropFilter: 'blur(16px)', boxShadow: '0 1px 0 rgba(71,181,255,.07)' }}>
          <div className="topbar-left">
            <Link className="back-btn" href="/">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              HUB
            </Link>
            <div className="topbar-breadcrumb">
              NOVOS VÍDEOS <span style={{ color: 'var(--text-dim)' }}>›</span> <span>{meta.title}</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="icon-btn notif-btn">
              <div className="notif-dot" />
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="avatar">MBC</div>
          </div>
        </header>

        {/* Player page */}
        <div className="player-page">
          <div className="player-main">

            {/* Video column */}
            <div className="video-col">
              <div className="video-wrapper fade-up">
                {loading && (
                  <div className="video-loading">
                    <div className="loading-spinner" />
                  </div>
                )}
                <div id="yt-player" style={{ width: '100%', height: '100%' }} />
              </div>

              {/* Completed banner */}
              {showCompletedBanner && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, padding: '14px 20px', background: 'rgba(74,222,128,.07)', border: '1px solid rgba(74,222,128,.2)', borderRadius: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#4ADE80" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Roboto Mono',monospace", fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#4ADE80' }}>VÍDEO CONCLUÍDO</div>
                    <div style={{ fontFamily: "'Roboto Mono',monospace", fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Este vídeo foi marcado como assistido no seu histórico.</div>
                  </div>
                </div>
              )}

              <div className="video-info fade-up fade-up-1">
                <div className="video-tag">{meta.tag || 'META ADS'}</div>
                <h1 className="video-title">{meta.title}</h1>
                <div className="video-meta-row">
                  <span className="video-meta-item">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4l2 2" strokeLinecap="round" />
                    </svg>
                    {meta.duration}
                  </span>
                  <span className="video-meta-item">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    {meta.views || '—'}
                  </span>
                  <span className="video-meta-item">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {meta.level || '—'}
                  </span>
                </div>

                <div className="video-actions fade-up fade-up-2">
                  <button className={`action-btn fav${isSaved ? ' saved' : ''}`} onClick={toggleSave}>
                    <svg width="14" height="14" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 21l-7.5-7.2A5 5 0 0 1 12 6.5a5 5 0 0 1 7.5 7.3L12 21z" strokeLinejoin="round" />
                    </svg>
                    <span>{isSaved ? 'SALVO' : 'SALVAR'}</span>
                  </button>

                  <div className="nav-spacer" />

                  {currentIndex > 0 && (
                    <button className="action-btn nav-btn" onClick={() => router.push(`/player?v=${CATALOG[currentIndex - 1].id}`)}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      ANTERIOR
                    </button>
                  )}

                  {currentIndex < CATALOG.length - 1 && (
                    <button className="action-btn nav-btn" onClick={() => router.push(`/player?v=${CATALOG[currentIndex + 1].id}`)}>
                      PRÓXIMO
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Playlist column */}
            <div className="playlist-col">
              <div className="playlist-header">
                <div className="playlist-accent" />
                <span className="playlist-title">Playlist</span>
                <span className="playlist-count">{currentIndex + 1} / {CATALOG.length}</span>
              </div>
              <div className="playlist-list">
                {CATALOG.map((v, i) => {
                  const isActive = v.id === videoId
                  const isDone = !isActive && (v.id in completedData)
                  const thumb = `/api/thumb/${v.id}`

                  return (
                    <Link
                      key={v.id}
                      className={`pitem${isActive ? ' active' : ''}`}
                      href={isActive ? '#' : `/player?v=${v.id}`}
                      style={{ opacity: isDone ? .75 : 1 }}
                    >
                      <span className="pitem-num" style={isDone ? { color: '#4ADE80' } : {}}>
                        {isActive
                          ? <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
                          : isDone
                          ? <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#4ADE80" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          : (i + 1)
                        }
                      </span>
                      <div className="pitem-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb} alt={v.title} onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100x56/0A1428/7AD1B8?text=MBC' }} />
                        {isActive && <div className="pitem-now"><div className="pitem-now-dot" /></div>}
                        {isDone && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(74,222,128,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#4ADE80" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </div>
                        )}
                      </div>
                      <div className="pitem-info">
                        <div className="pitem-cat">{isDone ? <span style={{ color: '#4ADE80' }}>✓ CONCLUÍDO</span> : v.tag}</div>
                        <div className="pitem-title">{v.title}</div>
                        <div className="pitem-dur">{v.duration}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

export default function PlayerPage() {
  return (
    <Suspense>
      <PlayerInner />
    </Suspense>
  )
}
