import { describe, expect, it } from 'vitest'
import { CDN_ICONFONT_VERSION_REG } from '../../src/tdesign/icons'

describe('tdesign/icons', () => {
  it('extracts the CDN iconfont version', () => {
    const source = 'const CDN_ICONFONT_URL = \'https://tdesign.gtimg.com/icon/0.3.1/fonts/index.css\';'
    expect(source.match(CDN_ICONFONT_VERSION_REG)?.[1]).toBe('0.3.1')
  })
})
