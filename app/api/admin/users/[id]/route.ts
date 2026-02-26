import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getRequestUser() {
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
  return user
}

async function assertAdmin(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'admin'
}

// GET /api/admin/users/[id] — detalhe do usuário
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getRequestUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('admin_user_view')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}

// PATCH /api/admin/users/[id] — atualiza perfil do membro
// Body: { full_name?, role?, is_active?, notes?, new_password? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getRequestUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const admin = createAdminClient()

  // Redefinição de senha — usa a Admin API do auth (separado do profiles)
  if (body.new_password) {
    if (body.new_password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }
    const { error: pwError } = await admin.auth.admin.updateUserById(id, {
      password: body.new_password,
    })
    if (pwError) return NextResponse.json({ error: pwError.message }, { status: 500 })
  }

  // Atualiza campos do profiles
  const allowed = ['full_name', 'role', 'is_active', 'notes']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from('profiles').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/users/[id] — remove usuário do auth e todos os dados
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getRequestUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Impede que o admin se auto-delete
  if (id === user.id) {
    return NextResponse.json({ error: 'Não é possível excluir o próprio usuário' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Impede exclusão de outro admin
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (targetProfile?.role === 'admin') {
    return NextResponse.json({ error: 'Não é possível excluir outro administrador' }, { status: 403 })
  }

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
