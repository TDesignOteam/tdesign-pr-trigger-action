import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  exec: vi.fn().mockResolvedValue(0),
  getExecOutput: vi.fn().mockResolvedValue({ stdout: 'develop\n', stderr: '', exitCode: 0 }),
}))

vi.mock('@actions/exec', () => mocks)

const { GitHelper } = await import('../src/utils/git-helper')

function createGitHelper() {
  return new GitHelper({ owner: 'Tencent', repo: 'tdesign-react', token: 'secret-token', dryRun: false })
}

describe('gitHelper pull request push', () => {
  beforeEach(() => {
    mocks.exec.mockClear()
    mocks.getExecOutput.mockClear()
  })

  it('pushes a same-repository PR to its head branch', async () => {
    const git = createGitHelper()
    await git.checkoutPullRequest(123, {
      branch: 'feature/update',
      cloneUrl: 'https://github.com/Tencent/tdesign-react.git',
      isFork: false,
    })
    await git.pushCurrent()

    expect(mocks.exec).toHaveBeenCalledWith('git', ['push', 'origin', 'HEAD:feature/update'], expect.objectContaining({ cwd: './tdesign-react' }))
  })

  it('pushes a fork PR to the fork head branch', async () => {
    const git = createGitHelper()
    await git.checkoutPullRequest(456, {
      branch: 'fix/button',
      cloneUrl: 'https://github.com/contributor/tdesign-react.git',
      isFork: true,
    })
    await git.pushCurrent()

    expect(mocks.exec).toHaveBeenCalledWith('git', ['remote', 'add', 'pull-request-head', 'https://github.com/contributor/tdesign-react.git'], { cwd: './tdesign-react' })
    expect(mocks.exec).toHaveBeenCalledWith('git', ['branch', '--set-upstream-to', 'pull-request-head/fix/button', 'pr-456'], { cwd: './tdesign-react' })
    expect(mocks.exec).toHaveBeenCalledWith('git', ['push', 'pull-request-head', 'HEAD:fix/button'], expect.objectContaining({ cwd: './tdesign-react' }))
  })

  it('does not persist the token in git configuration', async () => {
    const git = createGitHelper()
    await git.clone()

    const commands = mocks.exec.mock.calls.map(([, args]) => args).flat().join(' ')
    expect(commands).not.toContain('secret-token')
    expect(commands).not.toContain('insteadOf')
  })
})
