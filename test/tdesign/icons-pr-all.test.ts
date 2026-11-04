import type { TriggerContext } from '../../src/commands/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useTrigger from '../../src/commands'

const mocks = vi.hoisted(() => ({
  createComment: vi.fn(),
  getOctokit: vi.fn(),
}))

vi.mock('@actions/github', async importOriginal => ({
  ...await importOriginal<typeof import('@actions/github')>(),
  getOctokit: mocks.getOctokit,
}))

const commands = [
  '/pr-vue',
  '/pr-vue-next',
  '/pr-react',
  '/pr-mobile-vue',
  '/pr-mobile-react',
  '/pr-miniprogram',
  '/pr-tdesign',
  '/pr-flutter',
]

function createContext(overrides: Partial<TriggerContext> = {}): TriggerContext {
  return {
    owner: 'source-owner',
    repo: 'tdesign-icons',
    pr_number: 42,
    token: 'test-token',
    trigger: '/pr-all',
    dry_run: false,
    ...overrides,
  }
}

describe('icons /pr-all', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getOctokit.mockReturnValue({
      rest: {
        issues: { createComment: mocks.createComment },
      },
    })
    mocks.createComment.mockResolvedValue({ data: {} })
  })

  it('只向当前 PR 分别发送全部 8 个指令，不直接执行更新或递归发送 /pr-all', async () => {
    await useTrigger(createContext())

    expect(mocks.getOctokit).toHaveBeenCalledExactlyOnceWith('test-token')
    expect(mocks.createComment.mock.calls).toEqual(commands.map(body => [
      {
        owner: 'source-owner',
        repo: 'tdesign-icons',
        issue_number: 42,
        body,
      },
    ]))
  })

  it('等待上一条评论发送完成后再发送下一条', async () => {
    let finishFirst!: () => void
    mocks.createComment.mockImplementationOnce(() => new Promise((resolve) => {
      finishFirst = () => resolve({ data: {} })
    }))

    const pending = useTrigger(createContext())
    expect(mocks.createComment).toHaveBeenCalledTimes(1)
    finishFirst()
    await pending
    expect(mocks.createComment).toHaveBeenCalledTimes(8)
  })

  it('dry-run 不发布评论', async () => {
    await useTrigger(createContext({ dry_run: true }))
    expect(mocks.createComment).not.toHaveBeenCalled()
  })

  it('发送失败后停止，并报告成功发送的指令且保留原始错误', async () => {
    const cause = new Error('permission denied')
    mocks.createComment
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce(cause)

    await expect(useTrigger(createContext())).rejects.toMatchObject({
      message: '发送 /pr-vue-next 评论失败，已发送: /pr-vue；请勿重复发送已成功的指令',
      cause,
    })
    expect(mocks.createComment).toHaveBeenCalledTimes(2)
  })

  it('首条评论失败时报告尚无成功发送的指令', async () => {
    mocks.createComment.mockRejectedValueOnce(new Error('permission denied'))
    await expect(useTrigger(createContext())).rejects.toThrow('发送 /pr-vue 评论失败，已发送: 无')
    expect(mocks.createComment).toHaveBeenCalledTimes(1)
  })

  it.each([
    'tdesign',
    'tdesign-common',
    'tdesign-vue',
    'tdesign-vue-next',
    'tdesign-react',
    'tdesign-mobile-vue',
    'tdesign-mobile-react',
    'tdesign-miniprogram',
    'tdesign-flutter',
    'unknown-repo',
  ])('仓库 %s 不支持 /pr-all', async (repo) => {
    await expect(useTrigger(createContext({ repo }))).rejects.toThrow(`该仓库未适配: ${repo}`)
    expect(mocks.createComment).not.toHaveBeenCalled()
  })
})
