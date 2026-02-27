import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const VALID_ROLES = ['member', 'admin'] as const
const VALID_PRODUCTS = ['tmbc', 'ese', 'bidcap'] as const

async function getAdminSupabase() {
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
  return { user, supabase }
}

async function assertAdmin(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  return data?.role === 'admin'
}

// GET /api/admin/users — lista todos os usuários (via admin_user_view)
export async function GET() {
  const { user } = await getAdminSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('admin_user_view')
    .select('id, email, full_name, role, is_active, created_at, last_seen_at, notes, products, total_watch_seconds, completed_videos')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('admin_user_view GET error:', error.message)
    return NextResponse.json({ error: 'Erro ao buscar usuários.' }, { status: 500 })
  }
  return NextResponse.json({ users: data })
}

// POST /api/admin/users — cria novo membro
// Body: { email, password, full_name, role?, products?: string[] }
export async function POST(request: Request) {
  const { user } = await getAdminSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { email, password, full_name, role = 'member', products = [] } = body

  // Validação de inputs
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres.' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Role inválida.' }, { status: 400 })
  }
  if (!Array.isArray(products) || products.some((p: unknown) => !VALID_PRODUCTS.includes(p as typeof VALID_PRODUCTS[number]))) {
    return NextResponse.json({ error: 'Produto inválido.' }, { status: 400 })
  }
  if (full_name !== undefined && (typeof full_name !== 'string' || full_name.length > 200)) {
    return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Cria o usuário no auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? '' },
  })

  if (authError) {
    console.error('createUser error:', authError.message)
    return NextResponse.json({ error: 'Erro ao criar usuário. Verifique se o e-mail já está cadastrado.' }, { status: 400 })
  }

  const newUserId = authData.user.id

  // Upsert explícito do profile com email + dados do usuário.
  await admin
    .from('profiles')
    .upsert(
      { id: newUserId, email, full_name: full_name ?? null, role },
      { onConflict: 'id' }
    )

  // Concede produtos selecionados
  if (products.length > 0) {
    const grants = products.map((productId: string) => ({
      user_id: newUserId,
      product_id: productId,
      status: 'active',
    }))
    await admin.from('user_products').insert(grants)
  }

  return NextResponse.json({ ok: true, userId: newUserId }, { status: 201 })
}
