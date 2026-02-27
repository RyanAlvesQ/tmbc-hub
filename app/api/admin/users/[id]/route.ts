import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_ROLES = ['member', 'admin'] as const

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
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  const user = await getRequestUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('admin_user_view')
    .select('id, email, full_name, role, is_active, created_at, last_seen_at, notes, products, total_watch_seconds, completed_videos')
    .eq('id', id)
    .single()

  if (error) {
    console.error('admin_user_view GET [id] error:', error.message)
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }
  return NextResponse.json({ user: data })
}

// PATCH /api/admin/users/[id] — atualiza perfil do membro
// Body: { full_name?, role?, is_active?, notes?, new_password? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  const user = await getRequestUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const admin = createAdminClient()

  // Redefinição de senha — usa a Admin API do auth (separado do profiles)
  if (body.new_password !== undefined) {
    if (typeof body.new_password !== 'string' || body.new_password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, { status: 400 })
    }
    const { error: pwError } = await admin.auth.admin.updateUserById(id, {
      password: body.new_password,
    })
    if (pwError) {
      console.error('updateUserById password error:', pwError.message)
      return NextResponse.json({ error: 'Erro ao atualizar senha.' }, { status: 500 })
    }
  }

  // Atualiza campos do profiles — whitelist explícita
  const allowed = ['full_name', 'role', 'is_active', 'notes'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Valida role se fornecida
  if ('role' in updates && !VALID_ROLES.includes(updates.role as typeof VALID_ROLES[number])) {
    return NextResponse.json({ error: 'Role inválida.' }, { status: 400 })
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from('profiles').update(updates).eq('id', id)
    if (error) {
      console.error('profiles PATCH error:', error.message)
      return NextResponse.json({ error: 'Erro ao atualizar perfil.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/users/[id] — remove usuário do auth e todos os dados
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  const user = await getRequestUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Impede que o admin se auto-delete
  if (id === user.id) {
    return NextResponse.json({ error: 'Não é possível excluir o próprio usuário.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Impede exclusão de outro admin
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (targetProfile?.role === 'admin') {
    return NextResponse.json({ error: 'Não é possível excluir outro administrador.' }, { status: 403 })
  }

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    console.error('deleteUser error:', error.message)
    return NextResponse.json({ error: 'Erro ao excluir usuário.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
