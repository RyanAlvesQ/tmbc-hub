import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET /api/progress?video=v1
// Retorna o progresso do usuário autenticado para o vídeo especificado
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('video')

  if (!videoId) {
    return NextResponse.json({ error: 'video param required' }, { status: 400 })
  }

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

  const { data, error } = await supabase
    .from('watch_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('video_id', videoId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Normaliza o campo para o player: expõe como current_time no response JSON
  const progress = data ? { ...data, current_time: data.playback_position } : null

  return NextResponse.json({ progress }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

// POST /api/progress
// Body: { video_id, current_time, duration, progress, is_completed }
// Faz upsert no progresso e acumula total_watch_seconds
export async function POST(request: Request) {
  const body = await request.json()
  const { video_id, current_time, duration, progress, is_completed } = body

  if (!video_id || current_time == null || duration == null || progress == null) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

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

  // Busca registro atual para calcular delta de tempo assistido
  const { data: existing } = await supabase
    .from('watch_progress')
    .select('playback_position, total_watch_seconds, session_count')
    .eq('user_id', user.id)
    .eq('video_id', video_id)
    .maybeSingle()

  // Calcula segundos adicionais nesta sessão
  const prevTime = existing?.playback_position ?? 0
  const deltaSeconds = Math.max(0, Math.round(current_time - prevTime))
  const newTotalSeconds = (existing?.total_watch_seconds ?? 0) + deltaSeconds

  const upsertData: Record<string, unknown> = {
    user_id: user.id,
    video_id,
    playback_position: current_time,  // coluna no DB é playback_position
    duration,
    progress,
    is_completed: is_completed ?? false,
    last_watched_at: new Date().toISOString(),
    total_watch_seconds: newTotalSeconds,
    session_count: (existing?.session_count ?? 0) + (existing ? 0 : 1),
  }

  if (is_completed) {
    upsertData.completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('watch_progress')
    .upsert(upsertData, { onConflict: 'user_id,video_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
