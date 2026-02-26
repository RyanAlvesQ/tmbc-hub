import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { VIDEO_PRODUCT_MAP } from '@/lib/catalog'

// Server-only map: slug → YouTube video ID
// Nunca importar este mapeamento em client components
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

  // Verifica se o usuário tem acesso ativo ao produto que contém este vídeo.
  // Graceful: se a tabela user_products ainda não existir (schema não rodado),
  // deixa passar para não quebrar usuários existentes durante a migração.
  const requiredProduct = VIDEO_PRODUCT_MAP[slug]
  if (requiredProduct) {
    const { data: access, error: accessError } = await supabase
      .from('user_products')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', requiredProduct)
      .eq('status', 'active')
      .maybeSingle()

    if (!accessError && access === null) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.json({ youtubeId }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
