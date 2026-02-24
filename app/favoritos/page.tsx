'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { CATALOG } from '@/lib/catalog'
import { getFavs, setFavs } from '@/lib/storage'
import type { Video } from '@/types'

export default function FavoritosPage() {
  const [favVideos, setFavVideos] = useState<Video[]>([])

  useEffect(() => {
    const ids = getFavs()
    const videos = ids.map(id => CATALOG.find(v => v.id === id)).filter(Boolean) as Video[]
    setFavVideos(videos)
  }, [])

  const removeFav = (id: string) => {
    const favs = getFavs().filter(f => f !== id)
    setFavs(favs)
    setFavVideos(prev => prev.filter(v => v.id !== id))
  }

  const clearAll = () => {
    setFavs([])
    setFavVideos([])
  }

  return (
    <>
      <Sidebar />
      <div className="main-wrap">
        <Topbar alwaysScrolled />

        {/* Header */}
        <div style={{ padding: '92px 64px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 9, fontWeight: 500, letterSpacing: '.2em', color: 'var(--teal)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 16, height: 1, background: 'var(--teal)' }} />
                Coleção Pessoal
              </div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Vídeos Salvos</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {favVideos.length} vídeo{favVideos.length !== 1 ? 's' : ''} salvos · Vídeos que você marcou como favorito no player.
              </div>
            </div>

            {favVideos.length > 0 && (
              <button
                onClick={clearAll}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,77,106,.08)', border: '1px solid rgba(255,77,106,.2)', borderRadius: 8, padding: '9px 18px', fontFamily: "'Roboto Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: '.08em', color: '#FF8FA3', cursor: 'pointer' }}
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
                LIMPAR TUDO
              </button>
            )}
          </div>

          {/* Content */}
          {favVideos.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 20, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(71,181,255,.06)', border: '1px solid rgba(71,181,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 21l-7.5-7.2A5 5 0 0 1 12 6.5a5 5 0 0 1 7.5 7.3L12 21z" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Nenhum vídeo salvo ainda</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 400 }}>
                  Ao assistir um vídeo, clique em <strong style={{ color: 'var(--orange)' }}>SALVAR</strong> para adicioná-lo aqui e acessar rapidamente depois.
                </div>
              </div>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,200,.1)', border: '1px solid rgba(0,212,200,.2)', borderRadius: 8, padding: '10px 20px', fontFamily: "'Roboto Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '.1em', color: 'var(--teal)', textDecoration: 'none' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" opacity=".7" />
                  <rect x="13" y="2" width="9" height="9" rx="2" fill="currentColor" />
                  <rect x="2" y="13" width="9" height="9" rx="2" fill="currentColor" opacity=".4" />
                  <rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" opacity=".7" />
                </svg>
                EXPLORAR HUB DE VÍDEOS
              </Link>
            </div>
          ) : (
            <div className="fav-grid">
              {favVideos.map(v => {
                const thumb = `https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`
                const fallback = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`
                return (
                  <div key={v.id} className="vcard" style={{ position: 'relative' }}>
                    {/* Remove button */}
                    <button
                      onClick={() => removeFav(v.id)}
                      title="Remover dos favoritos"
                      style={{ position: 'absolute', top: 10, right: 10, zIndex: 20, width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,166,35,.15)', border: '1px solid rgba(245,166,35,.3)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21l-7.5-7.2A5 5 0 0 1 12 6.5a5 5 0 0 1 7.5 7.3L12 21z" />
                      </svg>
                    </button>

                    <Link href={`/player?v=${v.id}`} style={{ textDecoration: 'none', display: 'contents' }}>
                      <div className="vcard-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb} alt={v.title} onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback }} />
                        <div className="vcard-overlay">
                          <button className="play-btn">
                            <svg width="20" height="20" fill="#050810" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
                          </button>
                        </div>
                      </div>
                      <div className="vcard-body">
                        <div className="vcard-cat">{v.cat}</div>
                        <div className="vcard-title">{v.title}</div>
                        <div className="vcard-meta">
                          <span className="vcard-meta-item">
                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l2 2" strokeLinecap="round" />
                            </svg>
                            {v.duration}
                          </span>
                          <span className="vcard-meta-item" style={{ marginLeft: 'auto', color: 'var(--orange)' }}>
                            <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 21l-7.5-7.2A5 5 0 0 1 12 6.5a5 5 0 0 1 7.5 7.3L12 21z" />
                            </svg>
                            SALVO
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
