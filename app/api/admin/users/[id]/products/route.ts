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

// POST /api/admin/users/[id]/products — concede produto ao usuário
// Body: { product_id, payment_id?, notes? }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getRequestUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { product_id, payment_id, notes } = body

  if (!product_id) {
    return NextResponse.json({ error: 'product_id é obrigatório' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Upsert: se já existe (possivelmente revogado), reativa
  const { error } = await admin
    .from('user_products')
    .upsert(
      {
        user_id: id,
        product_id,
        status: 'active',
        purchased_at: new Date().toISOString(),
        payment_id: payment_id ?? null,
        notes: notes ?? null,
      },
      { onConflict: 'user_id,product_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

// DELETE /api/admin/users/[id]/products — revoga produto do usuário
// Body: { product_id, reason? } (reason: 'revoked' | 'refunded')
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getRequestUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await assertAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { product_id, reason = 'revoked' } = body

  if (!product_id) {
    return NextResponse.json({ error: 'product_id é obrigatório' }, { status: 400 })
  }

  const validReasons = ['revoked', 'refunded', 'expired']
  const status = validReasons.includes(reason) ? reason : 'revoked'

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_products')
    .update({ status })
    .eq('user_id', id)
    .eq('product_id', product_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
