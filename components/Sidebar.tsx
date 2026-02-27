'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Sidebar() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (data?.role === 'admin') setIsAdmin(true)
    }).catch(() => {})
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand_assets/TMBC.png" alt="TMBC Logo" />
        <div className="sidebar-logo-text">THE MEDIA<br />BUYER CLUB</div>
      </div>

      <nav className="nav-section">
        <Link className={`nav-item${pathname === '/' ? ' active' : ''}`} href="/">
          <span className="nav-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" opacity=".7" />
              <rect x="13" y="2" width="9" height="9" rx="2" fill="currentColor" />
              <rect x="2" y="13" width="9" height="9" rx="2" fill="currentColor" opacity=".4" />
              <rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" opacity=".7" />
            </svg>
          </span>
          <span className="nav-label">HUB DE VÍDEOS</span>
        </Link>

        <Link className={`nav-item${pathname === '/favoritos' ? ' active' : ''}`} href="/favoritos">
          <span className="nav-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21l-7.5-7.2A5 5 0 0 1 12 6.5a5 5 0 0 1 7.5 7.3L12 21z" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="nav-label">FAVORITOS</span>
        </Link>

        {isAdmin && (
          <Link className={`nav-item${pathname === '/admin' ? ' active' : ''}`} href="/admin">
            <span className="nav-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="nav-label">ADMIN</span>
          </Link>
        )}
      </nav>

      <div className="sidebar-bottom" />
    </aside>
  )
}
