import { VIDEO_MAP } from '@/lib/server/video-map'

describe('VIDEO_MAP', () => {
  it('contém os slugs v1, v2 e v3', () => {
    expect(VIDEO_MAP).toHaveProperty('v1')
    expect(VIDEO_MAP).toHaveProperty('v2')
    expect(VIDEO_MAP).toHaveProperty('v3')
  })

  it('todos os YouTube IDs são strings de 11 caracteres', () => {
    for (const [slug, id] of Object.entries(VIDEO_MAP)) {
      expect(typeof id).toBe('string')
      expect(id.length).toBe(11)
      // YouTube IDs usam base64url: a-z, A-Z, 0-9, _, -
      expect(id).toMatch(/^[a-zA-Z0-9_-]{11}$/)
    }
  })

  it('não há YouTube IDs duplicados', () => {
    const ids = Object.values(VIDEO_MAP)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})
