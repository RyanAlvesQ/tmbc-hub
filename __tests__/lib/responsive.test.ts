import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8')

describe('Responsividade — globals.css', () => {

  describe('Media queries existem', () => {
    it('tem breakpoint para tablet (max-width: 1024px)', () => {
      expect(css).toContain('@media (max-width: 1024px)')
    })

    it('tem breakpoint para mobile (max-width: 768px)', () => {
      expect(css).toContain('@media (max-width: 768px)')
    })

    it('tem breakpoint para telas pequenas (max-width: 480px)', () => {
      expect(css).toContain('@media (max-width: 480px)')
    })
  })

  describe('Sidebar mobile', () => {
    it('sidebar usa translateX(-100%) no mobile para esconder', () => {
      expect(css).toContain('transform: translateX(-100%)')
    })

    it('sidebar.open translada para posição visível', () => {
      expect(css).toContain('.sidebar.open')
      expect(css).toContain('transform: translateX(0)')
    })

    it('--sidebar-w é 0px no mobile', () => {
      expect(css).toContain('--sidebar-w: 0px')
    })

    it('sidebar-overlay existe para fechar sidebar', () => {
      expect(css).toContain('.sidebar-overlay')
    })
  })

  describe('Hamburger menu', () => {
    it('mobile-menu-btn está definido', () => {
      expect(css).toContain('.mobile-menu-btn')
    })

    it('mobile-menu-btn usa display: none por padrão', () => {
      // Só aparece no mobile via media query
      const match = css.match(/\.mobile-menu-btn\s*\{[^}]*display:\s*none/)
      expect(match).toBeTruthy()
    })

    it('mobile-menu-btn usa display: flex no mobile', () => {
      // Dentro do media query 768px
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.mobile-menu-btn')
      expect(mobileSection).toContain('display: flex')
    })
  })

  describe('Topbar mobile', () => {
    it('topbar left: 0 no mobile', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.topbar')
      expect(mobileSection).toContain('left: 0')
    })

    it('padding reduzido no topbar', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('padding: 0 16px')
    })
  })

  describe('Hero section mobile', () => {
    it('hero tem altura reduzida no mobile', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.hero')
      expect(mobileSection).toContain('height: 60vh')
    })

    it('hero-content tem padding reduzido', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.hero-content')
      expect(mobileSection).toContain('padding: 0 20px 48px')
    })

    it('hero-progress-wrap escondido no mobile', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.hero-progress-wrap')
      expect(mobileSection).toContain('display: none')
    })

    it('hero-decorative escondido no mobile', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.hero-decorative')
      expect(mobileSection).toContain('display: none')
    })
  })

  describe('Player page mobile', () => {
    it('player-main usa 1 coluna no mobile', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.player-main')
      expect(mobileSection).toContain('grid-template-columns: 1fr')
    })

    it('playlist-col remove border-left e adiciona border-top', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.playlist-col')
      expect(mobileSection).toContain('border-left: none')
      expect(mobileSection).toContain('border-top: 1px solid')
    })
  })

  describe('Cards e grids mobile', () => {
    it('vcard tem largura reduzida no mobile', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.vcard { width: 220px')
    })

    it('cursos-grid responsivo com 2 colunas no tablet e 1 no phone', () => {
      expect(css).toContain('.cursos-grid')
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('grid-template-columns: repeat(2, 1fr)')
      const smallSection = css.split('@media (max-width: 480px)')[1]
      expect(smallSection).toContain('grid-template-columns: 1fr')
    })
  })

  describe('Admin panel mobile', () => {
    it('admin-stats-grid usa 2 colunas no mobile', () => {
      const mobileSection = css.split('@media (max-width: 480px)')[1]
      expect(mobileSection).toContain('.admin-stats-grid')
    })

    it('admin-table-header escondido no mobile', () => {
      const mobileSection = css.split('@media (max-width: 480px)')[1]
      expect(mobileSection).toContain('.admin-table-header')
      expect(mobileSection).toContain('display: none')
    })

    it('admin-table-row usa 1 coluna no mobile', () => {
      const mobileSection = css.split('@media (max-width: 480px)')[1]
      expect(mobileSection).toContain('.admin-table-row')
      expect(mobileSection).toContain('grid-template-columns: 1fr')
    })
  })

  describe('Touch targets', () => {
    it('icon-btn tem 44px no mobile', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.icon-btn { width: 44px; height: 44px')
    })

    it('action-btn tem min-height: 44px no mobile', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.action-btn')
      expect(mobileSection).toContain('min-height: 44px')
    })
  })

  describe('Modais responsivos', () => {
    it('user-modal usa largura adaptável no mobile', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.user-modal')
      expect(mobileSection).toContain('width: auto')
    })

    it('notif-panel usa largura adaptável no mobile', () => {
      const mobileSection = css.split('@media (max-width: 768px)')[1]
      expect(mobileSection).toContain('.notif-panel')
      expect(mobileSection).toContain('width: auto')
    })
  })
})
