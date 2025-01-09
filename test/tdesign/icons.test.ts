import { describe, it, vi } from 'vitest'
import start from '../../src/tdesign/icons'
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
})
