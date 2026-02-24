import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Server-only map: slug → YouTube video ID
// Never import this mapping in client components
const VIDEO_MAP: Record<string, string> = {
  v1: 'x8_ZM5Ih_mg',
  v2: 'X_Wp8CBMSWQ',
  v3: '9aG7QDu8Z6k',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const youtubeId = VIDEO_MAP[slug]
  if (!youtubeId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ youtubeId }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
