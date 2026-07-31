import { Buffer } from 'node:buffer'
import process from 'node:process'
import { info, setSecret } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'

export interface GitContext {
  owner: string
  repo: string
  token: string
  dryRun: boolean
}

export interface PullRequestHead {
  branch: string
  cloneUrl: string
  isFork: boolean
}

export class GitHelper {
  private token: string
  private owner: string
  private repo: string
  private repoPath: string
  private dryRun: boolean
  private pushRemote = 'origin'
  private pushBranch = ''

  constructor(context: GitContext) {
    this.token = context.token
    this.owner = context.owner
    this.repo = context.repo
    this.dryRun = context.dryRun
    this.repoPath = `./${context.repo}`
  }

  private async initConfig() {
    await exec('git', ['config', '--global', 'user.name', 'tdesign-bot'])
    await exec('git', ['config', '--global', 'user.email', 'tdesign@tencent.com'])
  }

  private getAuthEnv() {
    const credentials = Buffer.from(`x-access-token:${this.token}`).toString('base64')
    setSecret(credentials)
    return {
      ...process.env,
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${credentials}`,
    }
  }

  private get repoUrl() {
    return `https://github.com/${this.owner}/${this.repo}.git`
  }

  async clone() {
    await this.initConfig()
    info(this.repoUrl)
    await exec('ls', ['-al'])
    await exec('git', ['clone', this.repoUrl, this.repoPath])
    await exec('ls', ['-al'])
    const { stdout } = await getExecOutput('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: this.repoPath })
    info(`当前分支: ${stdout.trim()}`)
    return stdout.trim()
  }

  async createBranch(branch: string) {
    await exec('git', ['checkout', '-b', branch], { cwd: this.repoPath })
  }

  async checkoutPullRequest(prNumber: number, head: PullRequestHead, recurseSubmodules = false) {
    const localBranch = `pr-${prNumber}`
    await exec('git', ['fetch', 'origin', `pull/${prNumber}/head:${localBranch}`], { cwd: this.repoPath })
    await exec('git', ['checkout', localBranch], { cwd: this.repoPath })

    this.pushBranch = head.branch
    if (head.isFork) {
      this.pushRemote = 'pull-request-head'
      await exec('git', ['remote', 'add', this.pushRemote, head.cloneUrl], { cwd: this.repoPath })
      await exec('git', ['fetch', this.pushRemote, head.branch], { cwd: this.repoPath })
      await exec('git', ['branch', '--set-upstream-to', `${this.pushRemote}/${head.branch}`, localBranch], { cwd: this.repoPath })
    }
    if (recurseSubmodules) {
      await this.initSubmodule()
    }
    return localBranch
  }

  async commit(message: string) {
    await exec('git', ['commit', '-am', message, '--no-verify'], { cwd: this.repoPath })
  }

  async commitAll(message: string) {
    await exec('git', ['add', '--all'], { cwd: this.repoPath })
    await exec('git', ['commit', message, '--no-verify'], { cwd: this.repoPath })
  }

  async push(branch: string) {
    if (this.dryRun) {
      info('dry-run模式, 不运行git push')
      return
    }
    await exec('git', ['push', 'origin', branch], { cwd: this.repoPath, env: this.getAuthEnv() })
  }

  async pushCurrent() {
    if (this.dryRun) {
      info('dry-run模式, 不运行git push')
      return
    }
    if (!this.pushBranch) {
      throw new Error('未配置 PR 推送分支')
    }
    await exec('git', ['push', this.pushRemote, `HEAD:${this.pushBranch}`], { cwd: this.repoPath, env: this.getAuthEnv() })
  }

  async initSubmodule() {
    await exec('git', ['submodule', 'update', '--init', '--recursive'], { cwd: this.repoPath })
  }

  async updateSubmodule() {
    await exec('git', ['submodule', 'update', '--remote'], { cwd: this.repoPath })
  }

  async updateSubmodulePath(path: string) {
    await exec('git', ['submodule', 'update', '--init', '--remote', path], { cwd: this.repoPath })
  }

  async updateSubmoduleToPullRequest(prNumber: number) {
    await exec('git', ['submodule', 'update', '--init', 'packages/common'], { cwd: this.repoPath })
    await exec('git', ['fetch', 'origin', `pull/${prNumber}/head:refs/heads/pr-${prNumber}`], { cwd: `${this.repoPath}/packages/common` })
    await exec('git', ['checkout', `pr-${prNumber}`], { cwd: `${this.repoPath}/packages/common` })
  }

  async mergeDevelop() {
    await exec('git', ['merge', 'develop', '--no-commit'], { cwd: this.repoPath, ignoreReturnCode: true })
  }

  async getUnmergedFiles(): Promise<string[]> {
    const { stdout } = await getExecOutput('git', ['diff', '--name-only', '--diff-filter=U'], { cwd: this.repoPath })
    return stdout.trim() ? stdout.trim().split('\n') : []
  }

  async resolveConflicts(files: string[], strategy: 'ours' | 'theirs') {
    if (!files.length) {
      return
    }
    await exec('git', ['checkout', `--${strategy}`, '--', ...files], { cwd: this.repoPath })
    await exec('git', ['add', '--', ...files], { cwd: this.repoPath })
  }

  async isNeedCommit() {
    const { stdout } = await getExecOutput('git', ['status', '--porcelain'], { cwd: this.repoPath })
    return Boolean(stdout.trim())
  }

  async printDiff() {
    await exec('git', ['diff'], { cwd: this.repoPath })
  }
}
