import type { TriggerContext } from '../../src/commands/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { repoConfig as miniprogramConfig } from '../../src/tdesign/miniprogram'
import { repoConfig as mobileReactConfig } from '../../src/tdesign/mobile-react'
import { repoConfig as mobileVueConfig } from '../../src/tdesign/mobile-vue'
import { updateCssvarsOnPr } from '../../src/tdesign/operations/update-cssvars'

const mocks = vi.hoisted(() => ({
  getPrData: vi.fn(),
  addComment: vi.fn(),
  clone: vi.fn(),
  fetchPullRequestHead: vi.fn(),
  initSubmodule: vi.fn(),
  isNeedCommit: vi.fn(),
  commitAll: vi.fn(),
  pushToRepo: vi.fn(),
  exec: vi.fn(),
  corepackEnable: vi.fn(),
}))

vi.mock('@actions/exec', () => ({ exec: mocks.exec }))

vi.mock('../../src/utils', () => ({
  corepackEnable: mocks.corepackEnable,
  GithubHelper: class {
    getPrData = mocks.getPrData
    addComment = mocks.addComment
  },
  GitHelper: class {
    clone = mocks.clone
    fetchPullRequestHead = mocks.fetchPullRequestHead
    initSubmodule = mocks.initSubmodule
    isNeedCommit = mocks.isNeedCommit
    commitAll = mocks.commitAll
    pushToRepo = mocks.pushToRepo
  },
}))

describe('/update-cssvars', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getPrData.mockResolvedValue({
      merged: false,
      head: {
        repo: { full_name: 'contributor/mobile' },
        ref: 'feature',
      },
    })
    mocks.isNeedCommit.mockResolvedValue(true)
  })

  function createContext(repo: string): TriggerContext {
    return {
      owner: 'Tencent',
      repo,
      pr_number: 42,
      token: 'test-token',
      trigger: '/update-cssvars',
      dry_run: true,
    }
  }

  it.each([mobileVueConfig, mobileReactConfig])('在 $targetRepo 生成全部 CSS 变量文档并推送到 PR', async (config) => {
    await updateCssvarsOnPr(createContext(config.targetRepo), config)

    expect(mocks.fetchPullRequestHead).toHaveBeenCalledWith(42, 'pr-42')
    expect(mocks.initSubmodule).toHaveBeenCalledOnce()
    expect(mocks.addComment).toHaveBeenCalledWith(42, expect.stringContaining('正在运行 CSS 变量文档更新'))
    expect(mocks.exec.mock.calls).toEqual([
      [
        'npm',
        ['install'],
        { cwd: `./${config.targetRepo}` },
      ],
      [
        'npm',
        ['run', 'api:css', 'all'],
        { cwd: `./${config.targetRepo}` },
      ],
    ])
    expect(mocks.commitAll).toHaveBeenCalledExactlyOnceWith('docs: update css vars')
    expect(mocks.pushToRepo).toHaveBeenCalledExactlyOnceWith('contributor/mobile', 'feature')
  })

  it('在小程序仓库根目录生成小程序和 UniApp 的 CSS 变量文档', async () => {
    await updateCssvarsOnPr(createContext(miniprogramConfig.targetRepo), miniprogramConfig)

    expect(mocks.corepackEnable).toHaveBeenCalledOnce()
    expect(mocks.exec.mock.calls).toEqual([
      [
        'pnpm',
        ['install'],
        { cwd: './tdesign-miniprogram' },
      ],
      [
        'pnpm',
        ['run', 'api:css', 'all'],
        { cwd: './tdesign-miniprogram' },
      ],
      [
        'pnpm',
        ['run', 'api:css:uni', 'all'],
        { cwd: './tdesign-miniprogram' },
      ],
    ])
    expect(mocks.commitAll).toHaveBeenCalledExactlyOnceWith('docs: update css vars')
    expect(mocks.pushToRepo).toHaveBeenCalledExactlyOnceWith('contributor/mobile', 'feature')
  })

  it('没有变更时不创建提交', async () => {
    mocks.isNeedCommit.mockResolvedValue(false)
    await updateCssvarsOnPr(createContext(mobileVueConfig.targetRepo), mobileVueConfig)
    expect(mocks.commitAll).not.toHaveBeenCalled()
    expect(mocks.pushToRepo).toHaveBeenCalledOnce()
  })

  it('pR 已合并时不运行脚本或推送', async () => {
    mocks.getPrData.mockResolvedValue({ merged: true })
    await updateCssvarsOnPr(createContext(mobileVueConfig.targetRepo), mobileVueConfig)
    expect(mocks.clone).not.toHaveBeenCalled()
    expect(mocks.exec).not.toHaveBeenCalled()
    expect(mocks.pushToRepo).not.toHaveBeenCalled()
  })

  it('生成失败时不提交或推送', async () => {
    mocks.exec.mockResolvedValueOnce(0).mockRejectedValueOnce(new Error('generation failed'))
    await expect(updateCssvarsOnPr(createContext(mobileVueConfig.targetRepo), mobileVueConfig)).rejects.toThrow('generation failed')
    expect(mocks.commitAll).not.toHaveBeenCalled()
    expect(mocks.pushToRepo).not.toHaveBeenCalled()
  })
})
