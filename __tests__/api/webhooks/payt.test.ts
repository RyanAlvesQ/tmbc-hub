// Mocks antes de qualquer import do handler
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: (init as { status?: number })?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}))

jest.mock('@/lib/supabase/admin', () => {
  // Cadeia fluente reutilizável para todos os from().select().eq()...
  const chain = {
    select:      jest.fn(),
    eq:          jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    upsert:      jest.fn().mockResolvedValue({ error: null }),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)

  return {
    createAdminClient: jest.fn(() => ({
      from: jest.fn().mockReturnValue(chain),
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'mock-user-id' } },
            error: null,
          }),
          generateLink: jest.fn().mockResolvedValue({
            data: { properties: { action_link: 'https://mock.supabase.co/link' } },
            error: null,
          }),
          listUsers: jest.fn().mockResolvedValue({ data: { users: [] } }),
        },
      },
    })),
  }
})

import { POST } from '@/app/api/webhooks/payt/route'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const SECRET = 'test-webhook-secret-123'

function makeRequest(body: unknown) {
  return new Request('https://tmbc-hub.vercel.app/api/webhooks/payt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validPayload = (overrides: Record<string, unknown> = {}) => ({
  integration_key: SECRET,
  status: 'paid',
  transaction_id: 'txn-test-001',
  customer: { name: 'João Comprador', email: 'joao@example.com' },
  product: { code: 'OFFER_TMBC', id: 'OFFER_TMBC' },
  ...overrides,
})

beforeEach(() => {
  process.env.PAYT_WEBHOOK_SECRET    = SECRET
  process.env.PAYT_OFFER_TMBC        = 'OFFER_TMBC'
  process.env.PAYT_OFFER_ESE         = 'OFFER_ESE'
  process.env.PAYT_OFFER_BIDCAP      = 'OFFER_BIDCAP'
  process.env.NEXT_PUBLIC_SITE_URL   = 'https://tmbc-hub.vercel.app'
  process.env.RESEND_API_KEY         = 'test-resend-key'

  global.fetch = jest.fn().mockResolvedValue(
    new Response('{}', { status: 200 })
  )
})

afterEach(() => {
  jest.clearAllMocks()
})

// ----------------------------------------------------------------
// Testes
// ----------------------------------------------------------------
describe('POST /api/webhooks/payt', () => {

  describe('Autenticação', () => {
    it('retorna 401 quando integration_key está incorreta', async () => {
      const res = await POST(makeRequest(validPayload({ integration_key: 'chave-errada' })))
      expect(res.status).toBe(401)
    })

    it('retorna 401 quando integration_key está ausente', async () => {
      const payload = validPayload()
      delete (payload as Record<string, unknown>).integration_key
      const res = await POST(makeRequest(payload))
      expect(res.status).toBe(401)
    })
  })

  describe('Filtragem de eventos', () => {
    it('ignora webhook de teste (test: true) e retorna ok', async () => {
      const res = await POST(makeRequest(validPayload({ test: true })))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true })
    })

    it('ignora status "pending" (boleto pendente)', async () => {
      const res = await POST(makeRequest(validPayload({ status: 'pending' })))
      expect(res.status).toBe(200)
    })

    it('ignora status "cancelled"', async () => {
      const res = await POST(makeRequest(validPayload({ status: 'cancelled' })))
      expect(res.status).toBe(200)
    })
  })

  describe('Validação de dados', () => {
    it('ignora payload sem email', async () => {
      const res = await POST(makeRequest(validPayload({ customer: { name: 'Test', email: '' } })))
      expect(res.status).toBe(200)
    })

    it('ignora payload com email inválido', async () => {
      const res = await POST(makeRequest(validPayload({ customer: { name: 'Test', email: 'nao-e-email' } })))
      expect(res.status).toBe(200)
    })

    it('ignora offer code não mapeado com múltiplos produtos configurados', async () => {
      const res = await POST(makeRequest(validPayload({ product: { code: 'OFERTA_DESCONHECIDA', id: 'OFERTA_DESCONHECIDA' } })))
      expect(res.status).toBe(200)
    })
  })

  describe('Processamento de compra aprovada', () => {
    it('processa status "paid" e retorna { ok: true }', async () => {
      const res = await POST(makeRequest(validPayload()))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true })
    })

    it('processa status "finalizada" como aprovado', async () => {
      const res = await POST(makeRequest(validPayload({ status: 'finalizada' })))
      expect(res.status).toBe(200)
    })

    it('processa status "aprovada" como aprovado', async () => {
      const res = await POST(makeRequest(validPayload({ status: 'aprovada' })))
      expect(res.status).toBe(200)
    })

    it('processa status "complete" como aprovado', async () => {
      const res = await POST(makeRequest(validPayload({ status: 'complete' })))
      expect(res.status).toBe(200)
    })

    it('processa offer code do ESE corretamente', async () => {
      const res = await POST(makeRequest(validPayload({ product: { code: 'OFFER_ESE', id: 'OFFER_ESE' } })))
      expect(res.status).toBe(200)
    })

    it('processa offer code do Bidcap corretamente', async () => {
      const res = await POST(makeRequest(validPayload({ product: { code: 'OFFER_BIDCAP', id: 'OFFER_BIDCAP' } })))
      expect(res.status).toBe(200)
    })

    it('usa único produto configurado quando offer code não está mapeado', async () => {
      // Com apenas 1 produto configurado, usa ele por padrão
      delete process.env.PAYT_OFFER_ESE
      delete process.env.PAYT_OFFER_BIDCAP
      const res = await POST(makeRequest(validPayload({ product: { code: 'QUALQUER', id: 'QUALQUER' } })))
      expect(res.status).toBe(200)
    })
  })
})
