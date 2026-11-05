import type { Trigger, TriggerContext } from '../src/commands/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useTrigger from '../src/commands'
import { updateCssvarsOnPr } from '../src/tdesign/operations/update-cssvars'
import { updateSite } from '../src/tdesign/operations/update-site'

vi.mock('../src/tdesign/operations/update-site', () => ({
  updateSite: vi.fn(),
}))

vi.mock('../src/tdesign/operations/update-cssvars', () => ({
  updateCssvarsOnPr: vi.fn(),
}))

function createContext(repo: string): TriggerContext {
  return {
    owner: 'Tencent',
    repo,
    pr_number: 42,
    token: 'test-token',
    trigger: '/update-site',
    dry_run: true,
  }
}

describe('/update-site routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    'tdesign-vue',
    'tdesign-vue-next',
    'tdesign-react',
    'tdesign-mobile-vue',
    'tdesign-mobile-react',
    'tdesign-miniprogram',
  ])('允许组件仓库 %s 更新站点', async (repo) => {
    const context = createContext(repo)
    await useTrigger(context)
    expect(updateSite).toHaveBeenCalledExactlyOnceWith(context)
  })

  it.each([
    'tdesign',
    'tdesign-icons',
    'tdesign-common',
    'tdesign-flutter',
    'unknown-repo',
  ])('拒绝未适配仓库 %s 更新站点', async (repo) => {
    await expect(useTrigger(createContext(repo))).rejects.toThrow(`该仓库未适配: ${repo}`)
    expect(updateSite).not.toHaveBeenCalled()
  })
})

describe('/update-cssvars routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(['tdesign-mobile-vue', 'tdesign-mobile-react', 'tdesign-miniprogram'])('允许已适配仓库 %s 更新 CSS 变量文档', async (repo) => {
    const context: TriggerContext = {
      ...createContext(repo),
      trigger: '/update-cssvars',
    }
    await useTrigger(context)
    expect(updateCssvarsOnPr).toHaveBeenCalledExactlyOnceWith(context, expect.objectContaining({ targetRepo: repo }))
  })

  it.each([
    'tdesign-vue',
    'tdesign-vue-next',
    'tdesign-react',
    'tdesign',
    'tdesign-icons',
    'tdesign-common',
    'tdesign-flutter',
    'unknown-repo',
  ])('拒绝未适配仓库 %s 更新 CSS 变量文档', async (repo) => {
    await expect(useTrigger({
      ...createContext(repo),
      trigger: '/update-cssvars',
    })).rejects.toThrow(`该仓库未适配: ${repo}`)
    expect(updateCssvarsOnPr).not.toHaveBeenCalled()
  })
})

it('不再支持已移除的 /upgrade-deps 指令', async () => {
  const context = {
    ...createContext('tdesign-react'),
    trigger: '/upgrade-deps' as Trigger,
  }
  await expect(useTrigger(context)).rejects.toThrow('未支持的触发器: /upgrade-deps')
})
