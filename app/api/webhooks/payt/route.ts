import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// =============================================================
// Mapeamento: ID da oferta na Payt → produto da plataforma
// Configurar no Vercel: Settings → Environment Variables
// =============================================================
function buildOfferMap(): Record<string, string> {
  const map: Record<string, string> = {}
  if (process.env.PAYT_OFFER_TMBC)   map[process.env.PAYT_OFFER_TMBC]   = 'tmbc'
  if (process.env.PAYT_OFFER_ESE)    map[process.env.PAYT_OFFER_ESE]    = 'ese'
  if (process.env.PAYT_OFFER_BIDCAP) map[process.env.PAYT_OFFER_BIDCAP] = 'bidcap'
  return map
}

// Normaliza status para saber se a compra foi aprovada
const APPROVED_STATUSES = [
  'approved', 'complete', 'completed', 'paid', 'active',
  'finalizada', 'finalizada/aprovada', 'aprovada', 'pago', 'venda paga',
]

function isApproved(status: string): boolean {
  return APPROVED_STATUSES.includes(status.toLowerCase().trim())
}

// Extrai campo tentando múltiplos caminhos (Payt V1 usa nested, V1 Flat usa flat)
function pick(obj: Record<string, unknown>, ...paths: string[]): string {
  for (const path of paths) {
    const parts = path.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = obj
    for (const p of parts) {
      val = val?.[p]
    }
    if (val && typeof val === 'string' && val.trim()) return val.trim()
    if (val && typeof val === 'number') return String(val)
  }
  return ''
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // =============================================================
  // 1. Validação do token secreto (se configurado)
  // =============================================================
  const secret = process.env.PAYT_WEBHOOK_SECRET
  if (secret) {
    const authHeader = request.headers.get('authorization') ?? ''
    const bodyToken  = '' // será lido após parse do body
    // Valida pelo header Authorization: Bearer <token>
    if (!authHeader.includes(secret) && bodyToken !== secret) {
      console.error(`[payt-webhook] Token inválido — IP: ${ip}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // =============================================================
  // 2. Parse do body (JSON ou form-encoded)
  // =============================================================
  const contentType = request.headers.get('content-type') ?? ''
  let body: Record<string, unknown> = {}

  try {
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      // form-encoded (application/x-www-form-urlencoded)
      const text = await request.text()
      body = Object.fromEntries(new URLSearchParams(text))
    }
  } catch (e) {
    console.error('[payt-webhook] Erro ao parsear body:', e)
    return NextResponse.json({ ok: true }) // Retorna 200 para evitar re-tentativas
  }

  // =============================================================
  // 3. Log do payload completo (para debug — ver em Vercel Logs)
  // =============================================================
  console.log('[payt-webhook] Payload recebido:', JSON.stringify(body, null, 2))

  // =============================================================
  // 4. Verificar se o evento é de compra aprovada
  // =============================================================
  const status = pick(body,
    'status',
    'transaction.status',
    'sale.status',
    'event',
    'sale_status',
  )

  if (!status || !isApproved(status)) {
    console.log(`[payt-webhook] Status ignorado: "${status}" — nenhuma ação necessária`)
    return NextResponse.json({ ok: true }) // Evento ignorado (ex: boleto pendente)
  }

  // =============================================================
  // 5. Extrair dados do cliente
  // =============================================================
  const email = pick(body,
    'customer.email',
    'customer_email',
    'email',
    'buyer.email',
    'contact.email',
    'sale.customer.email',
  ).toLowerCase()

  const name = pick(body,
    'customer.name',
    'customer_name',
    'name',
    'buyer.name',
    'customer.full_name',
    'sale.customer.name',
  )

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`[payt-webhook] Email inválido ou ausente no payload. IP: ${ip}`)
    return NextResponse.json({ ok: true })
  }

  // =============================================================
  // 6. Identificar produto
  // =============================================================
  const offerId = pick(body,
    'product.id',
    'offer.id',
    'offer_id',
    'product_id',
    'sale.product.id',
    'sale.offer.id',
    'plan.id',
  )

  const offerMap = buildOfferMap()
  const platformProductId = offerId ? offerMap[offerId] : undefined

  if (!platformProductId) {
    // Se não tiver mapeamento mas tiver apenas 1 oferta configurada, usa ela
    const allProducts = Object.values(offerMap)
    if (allProducts.length === 1) {
      console.log(`[payt-webhook] offer_id "${offerId}" não mapeado, usando único produto configurado: ${allProducts[0]}`)
    } else {
      console.error(`[payt-webhook] offer_id "${offerId}" não mapeado. Configure PAYT_OFFER_TMBC/ESE/BIDCAP no Vercel`)
      return NextResponse.json({ ok: true })
    }
  }

  const productId = platformProductId ?? Object.values(offerMap)[0]

  // =============================================================
  // 7. Extrair transaction ID (para idempotência)
  // =============================================================
  const transactionId = pick(body,
    'transaction.id',
    'transaction_id',
    'order_id',
    'sale.id',
    'payment_id',
    'id',
  )

  // =============================================================
  // 8. Idempotência — checar se este pagamento já foi processado
  // =============================================================
  const admin = createAdminClient()

  if (transactionId) {
    const { data: existing } = await admin
      .from('user_products')
      .select('id')
      .eq('payment_id', transactionId)
      .eq('payment_platform', 'payt')
      .maybeSingle()

    if (existing) {
      console.log(`[payt-webhook] Pagamento ${transactionId} já processado — ignorando`)
      return NextResponse.json({ ok: true })
    }
  }

  // =============================================================
  // 9. Criar ou localizar usuário
  // =============================================================
  let userId: string | null = null

  // Primeiro verifica se o email já existe em profiles
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    userId = existingProfile.id
    console.log(`[payt-webhook] Usuário existente encontrado: ${userId}`)
  } else {
    // Cria novo usuário no Supabase Auth
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true, // Email já verificado — veio de uma compra real
      user_metadata: { full_name: name || undefined },
    })

    if (createError) {
      // Pode acontecer se o usuário existir no auth mas não no profiles (race condition)
      console.error(`[payt-webhook] Erro ao criar usuário ${email}:`, createError.message)

      // Tenta buscar pelo auth diretamente
      const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const authUser = authList?.users?.find(u => u.email === email)
      if (authUser) {
        userId = authUser.id
        console.log(`[payt-webhook] Usuário encontrado no auth: ${userId}`)
      } else {
        console.error(`[payt-webhook] Não foi possível criar nem encontrar usuário para ${email}`)
        return NextResponse.json({ ok: true })
      }
    } else {
      userId = newUser.user.id
      console.log(`[payt-webhook] Novo usuário criado: ${userId}`)
    }
  }

  // =============================================================
  // 10. Conceder acesso ao produto (insert — NÃO upsert para preservar
  //     dados de compra anterior se cliente comprar novamente)
  // =============================================================
  const { error: productError } = await admin
    .from('user_products')
    .upsert(
      {
        user_id:          userId,
        product_id:       productId,
        status:           'active',
        payment_id:       transactionId || null,
        payment_platform: 'payt',
      },
      {
        onConflict: 'user_id,product_id',
        ignoreDuplicates: false, // Atualiza status para active se estava revogado
      }
    )

  if (productError) {
    console.error(`[payt-webhook] Erro ao gravar user_products para ${email}:`, productError.message)
    return NextResponse.json({ ok: true })
  }

  console.log(`[payt-webhook] Acesso concedido: ${email} → ${productId}`)

  // =============================================================
  // 11. Enviar email de "definir sua senha" via Supabase
  //     O cliente recebe um link que leva ao /login → view newpwd
  // =============================================================
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tmbc-hub.vercel.app'

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/login`,
    })

    if (emailError) {
      console.error(`[payt-webhook] Erro ao enviar email para ${email}:`, emailError.message)
    } else {
      console.log(`[payt-webhook] Email de acesso enviado para ${email}`)
    }
  } catch (e) {
    console.error(`[payt-webhook] Exceção ao enviar email:`, e)
  }

  return NextResponse.json({ ok: true })
}
