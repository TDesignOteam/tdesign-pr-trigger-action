import { describe, expect, it, vi } from 'vitest'
import start, { CND_ICONFONT_VERSION_REG } from '../../src/tdesign/icons'
import pr_data from '../fixtures/tdesign-icons-pr-data.json' with { type: 'json' }

vi.mock('../../src/utils.ts', async () => {
  return {
    ...(await vi.importActual<typeof import('../../src/utils.ts')>('../../src/utils.ts')),
    getPrData: () => pr_data,
    getPkgLatestVersion: () => 'x.x.x',
    cloneRepo: () => vi.fn(),
  }
})

describe('tdesign/icons', () => {
  describe('comment', () => {
    it('/pr-vue', async () => {
      const context = {
        owner: 'Tencent',
        repo: 'tdesign-icons',
        pr_number: 1,
        comment: '/pr-vue',
        token: 'token',
      }
      start(context)
    })
  })
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
