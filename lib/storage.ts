import type { WatchProgress, CompletedMap } from '@/types'
import { CATALOG } from './catalog'

const WP_KEY        = 'mbc_watch_progress'
const FAV_KEY       = 'mbc_favorites'
const COMPLETED_KEY = 'mbc_completed'
const NOTIF_KEY     = 'mbc_notif_read'

export function getFavs(): string[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem(FAV_KEY) || '[]')
}

export function setFavs(arr: string[]): void {
  localStorage.setItem(FAV_KEY, JSON.stringify(arr))
}

export function toggleFav(videoId: string): boolean {
  const favs = getFavs()
  const idx = favs.indexOf(videoId)
  if (idx >= 0) {
    favs.splice(idx, 1)
  } else {
    // Store full video object for Favoritos page
    const video = CATALOG.find(v => v.id === videoId)
    if (video) {
      const favObjs = getFavObjects()
      favObjs.push(video)
      localStorage.setItem(FAV_KEY, JSON.stringify(favObjs.map(v => v.id)))
    }
    favs.push(videoId)
  }
  setFavs(favs)
  return favs.includes(videoId)
}

export function getFavObjects() {
  const ids = getFavs()
  return CATALOG.filter(v => ids.includes(v.id))
}

export function getWP(): WatchProgress {
  if (typeof window === 'undefined') return {}
  return JSON.parse(localStorage.getItem(WP_KEY) || '{}')
}

export function setWP(data: WatchProgress): void {
  localStorage.setItem(WP_KEY, JSON.stringify(data))
}

export function getCompleted(): CompletedMap {
  if (typeof window === 'undefined') return {}
  return JSON.parse(localStorage.getItem(COMPLETED_KEY) || '{}')
}

export function markCompleted(id: string): void {
  const c = getCompleted()
  c[id] = Date.now()
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(c))
}

export function getNotifRead(): string[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]')
}

export function markAllNotifsRead(ids: string[]): void {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(ids))
}
