import { NextResponse } from 'next/server'
import { VIDEO_MAP } from '@/lib/server/video-map'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Auth is enforced by middleware.ts for all /api/* routes.
  // Here we just map slug → thumbnail without exposing the YouTube ID to the client.
  const youtubeId = VIDEO_MAP[slug]
  if (!youtubeId) {
    return new NextResponse(null, { status: 404 })
  }

  // Try max-res first, fall back to hq
  const urls = [
    `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
  ]

  for (const url of urls) {
    const res = await fetch(url)
    if (res.ok) {
      const buffer = await res.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      })
    }
  }

  return new NextResponse(null, { status: 404 })
}
