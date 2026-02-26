import type { Video } from '@/types'

// Definição dos produtos — usada no hub e nas páginas de curso
export const PRODUCT_CATALOG = [
  {
    id: 'tmbc',
    name: 'TMBC',
    fullName: 'The Media Buyer Club',
    color: '#7AD1B8',
    colorRgb: '122,209,184',
  },
  {
    id: 'ese',
    name: 'ESE',
    fullName: 'ESE',
    color: '#47B5FF',
    colorRgb: '71,181,255',
  },
  {
    id: 'bidcap',
    name: 'Bidcap',
    fullName: 'Reunião Secreta do Bidcap',
    color: '#F5A623',
    colorRgb: '245,166,35',
  },
] as const

export type ProductId = 'tmbc' | 'ese' | 'bidcap'

// IDs são slugs opacos — YouTube IDs ficam apenas em app/api/video/[slug]/route.ts
// productId: qual produto o usuário precisa ter comprado para acessar este vídeo
export const CATALOG: Video[] = [
  {
    id: 'v1',
    title: 'Como criar novos top spenders — toda semana. @oraphaelpaiva',
    cat: 'Meta Ads · Avançado',
    duration: '15:48',
    tag: 'META ADS',
    views: '1.6k visualizações',
    level: 'Avançado',
    productId: 'tmbc',
  },
  {
    id: 'v2',
    title: 'Atualização - 30.01.26',
    cat: 'Meta Ads · Intermediário',
    duration: '8:57',
    tag: 'META ADS',
    views: '2.5k visualizações',
    level: 'Intermediário',
    productId: 'tmbc',
  },
  {
    id: 'v3',
    title: 'Outros modos e otimização',
    cat: 'Meta Ads · Avançado',
    duration: '7:56',
    tag: 'META ADS',
    views: '4.6k visualizações',
    level: 'Avançado',
    productId: 'tmbc',
  },
]

// Mapa slug → productId para lookup rápido nas API routes (server-only)
export const VIDEO_PRODUCT_MAP: Record<string, string> = Object.fromEntries(
  CATALOG.map(v => [v.id, v.productId])
)
