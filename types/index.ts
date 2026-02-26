export interface Video {
  id: string
  title: string
  cat: string
  duration: string
  tag?: string
  views?: string
  level?: string
  productId: string  // 'tmbc' | 'ese' | 'bidcap' — qual produto dá acesso a este vídeo
}

export interface WatchEntry {
  currentTime: number
  duration: number
  progress: number
  lastWatched: number
}

export interface WatchProgress {
  [videoId: string]: WatchEntry
}

export interface CompletedMap {
  [videoId: string]: number // timestamp
}

// ---- Tipos do banco Supabase ----

export interface Profile {
  id: string
  full_name: string | null
  role: 'member' | 'admin'
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  last_seen_at: string | null
}

export interface Product {
  id: string
  name: string
  description: string | null
  access_type: 'lifetime' | 'subscription'
  subscription_days: number | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface UserProduct {
  id: string
  user_id: string
  product_id: string
  status: 'active' | 'revoked' | 'refunded' | 'expired'
  purchased_at: string
  expires_at: string | null
  bonus_unlocks_at: string  // campo gerado: purchased_at + 7 dias
  payment_id: string | null
  payment_platform: string
  notes: string | null
  created_at: string
  updated_at: string
  // join opcional
  product_name?: string
}

export interface WatchProgressDB {
  id: string
  user_id: string
  video_id: string
  playback_position: number  // renomeado: current_time é palavra reservada no Postgres
  duration: number
  progress: number
  is_completed: boolean
  completed_at: string | null
  last_watched_at: string
  total_watch_seconds: number
  session_count: number
  created_at: string
  updated_at: string
}

// View admin_user_view
export interface AdminUserRow {
  id: string
  email: string
  full_name: string | null
  role: 'member' | 'admin'
  is_active: boolean
  created_at: string
  last_seen_at: string | null
  notes: string | null
  products: {
    product_id: string
    product_name: string
    status: UserProduct['status']
    purchased_at: string
    bonus_unlocks_at: string
    expires_at: string | null
    payment_id: string | null
  }[]
  total_watch_seconds: number
  completed_videos: number
}
