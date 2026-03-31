import { describe, expect, it } from 'vitest'

// This constant should match the implementation in icons.ts
const CDN_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/

describe('tdesign/icons', () => {
  describe('cdn iconfont version regex', () => {
    it('should extract version from direct CDN URL', () => {
      const testUrl = 'https://tdesign.gtimg.com/icon/0.3.1/fonts/index.css'
      const match = testUrl.match(CDN_ICONFONT_VERSION_REG)
      expect(match).toBeTruthy()
      expect(match?.[1]).toBe('0.3.1')
    })

    it('should extract version from code containing CDN URL', () => {
      const testCode = `const CDN_ICONFONT_URL = 'https://tdesign.gtimg.com/icon/0.3.1/fonts/index.css';`
      const match = testCode.match(CDN_ICONFONT_VERSION_REG)
      expect(match).toBeTruthy()
      expect(match?.[1]).toBe('0.3.1')
    })

    it('should not match invalid version format', () => {
      const invalidUrl = 'https://tdesign.gtimg.com/icon/v0.3.1/fonts/index.css'
      const match = invalidUrl.match(CDN_ICONFONT_VERSION_REG)
      expect(match).toBeNull()
    })

    it('should handle semantic versioning with multiple digits', () => {
      const testUrl = 'https://tdesign.gtimg.com/icon/10.20.30/fonts/index.css'
      const match = testUrl.match(CDN_ICONFONT_VERSION_REG)
      expect(match).toBeTruthy()
      expect(match?.[1]).toBe('10.20.30')
    })
  })
})
