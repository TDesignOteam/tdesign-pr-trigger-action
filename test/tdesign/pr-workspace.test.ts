import { describe, expect, it, vi } from 'vitest'
import { checkoutPr } from '../../src/tdesign/operations/pr-workspace'

const mocks = vi.hoisted(() => ({
  getPrData: vi.fn(),
  clone: vi.fn(),
  fetchPullRequestHead: vi.fn(),
  initSubmodule: vi.fn(),
  gitConstructor: vi.fn(),
}))

vi.mock('../../src/utils', () => ({
  GithubHelper: class {
    getPrData = mocks.getPrData
  },
  GitHelper: class {
    constructor(context: unknown) {
      mocks.gitConstructor(context)
    }

    clone = mocks.clone
    fetchPullRequestHead = mocks.fetchPullRequestHead
    initSubmodule = mocks.initSubmodule
  },
}))

describe('checkoutPr', () => {
  it('从评论所在 fork 拉取 PR，而不是固定上游仓库', async () => {
    mocks.getPrData.mockResolvedValue({
      merged: false,
      head: {
        repo: { full_name: 'contributor/tdesign-react' },
        ref: 'feature',
      },
    })

    const workspace = await checkoutPr({
      owner: 'fork-owner',
      repo: 'tdesign-react',
      pr_number: 42,
      token: 'test-token',
      trigger: '/update-snapshot',
      dry_run: true,
    })

    expect(mocks.gitConstructor).toHaveBeenCalledWith({
      owner: 'fork-owner',
      repo: 'tdesign-react',
      token: 'test-token',
      dryRun: true,
    })
    expect(mocks.fetchPullRequestHead).toHaveBeenCalledWith(42, 'pr-42')
    expect(workspace?.headRepo).toBe('contributor/tdesign-react')
    expect(workspace?.headBranch).toBe('feature')
  })
})
