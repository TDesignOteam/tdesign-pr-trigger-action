import { describe, expect, it } from 'vitest'
import { CND_ICONFONT_VERSION_REG } from '../../src/tdesign/icons'

describe('tdesign/icons', () => {
  describe('regex', () => {
    it(':CND_ICONFONT_VERSION_REG', () => {
      const str1 = 'https://tdesign.gtimg.com/icon/0.3.1/fonts/index.css'
      const match1 = str1.match(CND_ICONFONT_VERSION_REG)
      expect(match1).toBeTruthy()
      expect(match1?.[1]).toBe('0.3.1')
      const str2 = `const CDN_ICONFONT_URL = 'https://tdesign.gtimg.com/icon/0.3.1/fonts/index.css';`
      const match2 = str2.match(CND_ICONFONT_VERSION_REG)
      expect(match2).toBeTruthy()
      expect(match2?.[1]).toBe('0.3.1')
    })
  })
})
