import type { Video } from '@/types'

// IDs are opaque slugs — YouTube video IDs live only in app/api/video/[slug]/route.ts
export const CATALOG: Video[] = [
  {
    id: 'v1',
    title: 'Como criar novos top spenders — toda semana. @oraphaelpaiva',
    cat: 'Meta Ads · Avançado',
    duration: '15:48',
    tag: 'META ADS',
    views: '1.6k visualizações',
    level: 'Avançado',
  },
  {
    id: 'v2',
    title: 'Atualização - 30.01.26',
    cat: 'Meta Ads · Intermediário',
    duration: '8:57',
    tag: 'META ADS',
    views: '2.5k visualizações',
    level: 'Intermediário',
  },
  {
    id: 'v3',
    title: 'Outros modos e otimização',
    cat: 'Meta Ads · Avançado',
    duration: '7:56',
    tag: 'META ADS',
    views: '4.6k visualizações',
    level: 'Avançado',
  },
]
