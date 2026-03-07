import { checkCsrf } from '@/lib/csrf'

// Mock next/server so NextResponse.json works in Node test environment
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: (init as { status?: number })?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}))

function makeRequest(headers: Record<string, string>) {
  return new Request('https://example.com/api/test', { headers })
}

describe('checkCsrf', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://tmbc-hub.vercel.app'
  })

  it('permite requisição sem header Origin (server-side / curl)', () => {
    const req = makeRequest({})
    expect(checkCsrf(req)).toBeNull()
  })

  it('permite Origin igual ao site URL configurado', () => {
    const req = makeRequest({ origin: 'https://tmbc-hub.vercel.app' })
    expect(checkCsrf(req)).toBeNull()
  })

  it('bloqueia Origin externo com status 403', async () => {
    const req = makeRequest({ origin: 'https://evil.com' })
    const res = checkCsrf(req)
    expect(res).not.toBeNull()
    expect(res!.status).toBe(403)
    const body = await res!.json()
    expect(body).toEqual({ error: 'Forbidden' })
  })

  it('permite localhost em desenvolvimento', () => {
    const req = makeRequest({ origin: 'http://localhost:3000' })
    expect(checkCsrf(req)).toBeNull()
  })

  it('permite 127.0.0.1 em desenvolvimento', () => {
    const req = makeRequest({ origin: 'http://127.0.0.1:3000' })
    expect(checkCsrf(req)).toBeNull()
  })
})
