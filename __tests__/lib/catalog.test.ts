import { PRODUCT_CATALOG } from '@/lib/catalog'

describe('PRODUCT_CATALOG', () => {
  it('tem exatamente 3 produtos', () => {
    expect(PRODUCT_CATALOG).toHaveLength(3)
  })

  it('contém os produtos tmbc, ese e bidcap', () => {
    const ids = PRODUCT_CATALOG.map(p => p.id)
    expect(ids).toContain('tmbc')
    expect(ids).toContain('ese')
    expect(ids).toContain('bidcap')
  })

  it('todos os produtos têm campos obrigatórios preenchidos', () => {
    for (const product of PRODUCT_CATALOG) {
      expect(product.id).toBeTruthy()
      expect(product.name).toBeTruthy()
      expect(product.fullName).toBeTruthy()
      expect(product.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('IDs não têm espaços nem caracteres especiais', () => {
    for (const product of PRODUCT_CATALOG) {
      expect(product.id).toMatch(/^[a-z0-9_-]+$/)
    }
  })
})
