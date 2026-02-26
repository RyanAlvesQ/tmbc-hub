import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

  if (!email || !password) {
    return NextResponse.json({ error: 'email e password são obrigatórios' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Cria o usuário no auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? '' },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const newUserId = authData.user.id

  // Upsert explícito do profile com email + dados do usuário.
  // O trigger handle_new_user já faz o INSERT, mas usamos upsert aqui
  // para garantir que email, full_name e role sejam salvos corretamente
  // mesmo que haja timing issues entre o trigger e este código.
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
