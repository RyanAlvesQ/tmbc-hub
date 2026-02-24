export interface Video {
  id: string
  title: string
  cat: string
  duration: string
  tag?: string
  views?: string
  level?: string
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
