import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

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
  // 1. Parse do body (JSON ou form-encoded)
  // =============================================================
  const contentType = request.headers.get('content-type') ?? ''
  let body: Record<string, unknown> = {}

  try {
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      const text = await request.text()
      body = Object.fromEntries(new URLSearchParams(text))
    }
  } catch (e) {
    console.error('[payt-webhook] Erro ao parsear body:', e)
    return NextResponse.json({ ok: true })
  }

  // =============================================================
  // 2. Validar integration_key (Chave Única do postback na Payt)
  //    A Payt envia no body como "integration_key"
  // =============================================================
  const secret = process.env.PAYT_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.warn('[payt-webhook] PAYT_WEBHOOK_SECRET não configurado — validação de segurança desativada!')
  } else {
    const receivedKey = (typeof body.integration_key === 'string' ? body.integration_key : '').trim()
    const secBuf = Buffer.from(secret)
    const recBuf = Buffer.from(receivedKey)
    const valid = recBuf.length === secBuf.length && timingSafeEqual(recBuf, secBuf)
    if (!valid) {
      console.error(`[payt-webhook] integration_key inválido — IP: ${ip}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // =============================================================
  // 3. Ignorar webhooks de teste (test: true)
  // =============================================================
  if (body.test === true) {
    console.log('[payt-webhook] Webhook de teste recebido — ignorando processamento')
    return NextResponse.json({ ok: true })
  }

  // =============================================================
  // 4. Verificar se o evento é de compra aprovada
  //    Payt V1 envia status na raiz: "status": "paid"
  // =============================================================
  const status = pick(body,
    'status',
    'transaction.payment_status',
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
  // Payt V1: o código do produto fica em product.code
  const offerId = pick(body,
    'product.code',
    'product.id',
    'offer.code',
    'offer.id',
    'offer_id',
    'product_id',
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
  // Payt V1: transaction_id fica na raiz do body
  const transactionId = pick(body,
    'transaction_id',
    'cart_id',
    'transaction.id',
    'order_id',
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
  // 11. Gerar link de acesso (OTP, sem PKCE) + enviar via Resend
  //     admin.generateLink → link OTP direto do Supabase (sem code_verifier)
  //     Resend HTTP API → entrega garantida, sem limites de rate do Supabase
  // =============================================================
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL
  const resendKey  = process.env.RESEND_API_KEY

  if (!siteUrl || !resendKey) {
    console.warn('[payt-webhook] NEXT_PUBLIC_SITE_URL ou RESEND_API_KEY ausente — email não enviado')
    return NextResponse.json({ ok: true })
  }

  try {
    // 1. Gerar link OTP de recuperação (sem PKCE — funciona em qualquer browser)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${siteUrl}/auth/callback?next=reset` },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error(`[payt-webhook] Erro ao gerar link para ${email}:`, linkError?.message)
      return NextResponse.json({ ok: true })
    }

    const actionLink = linkData.properties.action_link

    // 2. Enviar email via Resend HTTP API
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Media Buyer Club <onboarding@resend.dev>',
        to: [email],
        subject: 'Seu acesso ao The Media Buyer Club está pronto',
        html: `
          <div style="font-family:Inter,sans-serif;background:#07040B;color:#E8E4F0;padding:40px 20px;max-width:520px;margin:0 auto;border-radius:12px;border:1px solid #2A2433;">
            <img src="${siteUrl}/brand_assets/TMBC.png" alt="The Media Buyer Club" style="width:120px;margin-bottom:24px;display:block;" />
            <h1 style="font-size:22px;font-weight:700;color:#7AD1B8;margin:0 0 12px;">Bem-vindo ao TMBC!</h1>
            <p style="color:#B8B0C8;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Sua compra foi confirmada. Clique no botão abaixo para criar sua senha e acessar sua área de membros.
            </p>
            <a href="${actionLink}" style="display:inline-block;background:#7AD1B8;color:#04201E;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
              CRIAR MINHA SENHA
            </a>
            <p style="color:#6B6380;font-size:12px;margin:24px 0 0;line-height:1.5;">
              Este link é válido por 24 horas. Se não solicitou acesso, ignore este email.
            </p>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const errBody = await emailRes.text()
      console.error(`[payt-webhook] Resend erro (${emailRes.status}): ${errBody}`)
    } else {
      console.log(`[payt-webhook] Email de acesso enviado via Resend para ${email}`)
    }
  } catch (e) {
    console.error(`[payt-webhook] Exceção ao enviar email:`, e)
  }

  return NextResponse.json({ ok: true })
}
