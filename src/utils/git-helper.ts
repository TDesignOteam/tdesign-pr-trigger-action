import { info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'
import { DEFAULT_BASE_BRANCH, GIT_CONFIG } from '../config/constants'

// Regex for parsing git status conflict files
const _BOTH_MODIFIED_REG = /both modified:\s+(.+)/g

export interface GitContext {
  owner: string
  repo: string
  token: string
  dryRun: boolean
}
export class GitHelper {
  private token: string
  private owner: string
  private repo: string
  private repoPath: string
  private dryRun: boolean

  constructor(context: GitContext) {
    this.token = context.token
    this.owner = context.owner
    this.repo = context.repo
    this.dryRun = context.dryRun
    this.repoPath = `./${context.repo}`
  }

  private isDryRun(): boolean {
    return this.dryRun
  }

  private logDryRunInfo(action: string, details?: Record<string, unknown>): void {
    if (this.isDryRun()) {
      const message = details ? `${action}: ${JSON.stringify(details)}` : action
      info(`[DRY-RUN] ${message}`)
    }
  }

  private async initConfig() {
    await exec('git', ['config', '--global', 'user.name', GIT_CONFIG.USER_NAME])
    await exec('git', ['config', '--global', 'user.email', GIT_CONFIG.USER_EMAIL])
    await exec('git', ['config', '--global', `url.https://${this.token}@github.com/.insteadOf`, 'https://github.com/'])
  }

  async mergeDevelop() {
    await exec('git', ['merge', DEFAULT_BASE_BRANCH, '--no-commit'], { cwd: this.repoPath })
  }

  async getConflictFiles(): Promise<string[]> {
    const { stdout } = await getExecOutput('git', ['status'], { cwd: this.repoPath })
    const matches = stdout.match(_BOTH_MODIFIED_REG)
    if (!matches) {
      return []
    }
    return matches.map(line => line.replace('both modified: ', '').trim())
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

  async checkoutBranch(branch: string) {
    await exec('git', ['checkout', branch], { cwd: this.repoPath })
  }

  /**
   * Checkout PR branch via git fetch
   */
  async checkoutPr(prNumber: number) {
    await exec('git', ['fetch', 'origin', `pull/${prNumber}/head:pr-${prNumber}`], { cwd: this.repoPath })
    await exec('git', ['checkout', `pr-${prNumber}`], { cwd: this.repoPath })
  }

  /**
   * Add a remote for forked repository
   */
  async addRemote(name: string, url: string) {
    await exec('git', ['remote', 'add', name, url], { cwd: this.repoPath })
    await exec('git', ['fetch', name], { cwd: this.repoPath })
  }

  /**
   * Set upstream for current branch
   */
  async setUpstream(remote: string, branch: string) {
    await exec('git', ['branch', '--set-upstream-to', `${remote}/${branch}`], { cwd: this.repoPath })
  }

  async commit(message: string) {
    await exec('git', ['commit', '-am', message, '--no-verify'], { cwd: this.repoPath })
  }

  async push(branch: string, forkOwner?: string) {
    if (this.isDryRun()) {
      this.logDryRunInfo('git push', { branch, forkOwner })
      return
    }
    // Fork PR: push to fork owner's branch
    if (forkOwner) {
      await exec('git', ['push', forkOwner, `HEAD:${branch}`], { cwd: this.repoPath })
    }
    else {
      await exec('git', ['push', 'origin', branch], { cwd: this.repoPath })
    }
  }

  async initSubmodule() {
    await exec('git', ['submodule', 'update', '--init', '--recursive'], { cwd: this.repoPath })
  }

  async updateSubmodule() {
    await exec('git', ['submodule', 'update', '--remote'], { cwd: this.repoPath })
  }

  async isNeedCommit() {
    const { stdout } = await getExecOutput('git', ['status'], { cwd: this.repoPath })
    return !stdout.includes('nothing to commit, working tree clean')
  }

  async printDiff() {
    await exec('git', ['diff'], { cwd: this.repoPath })
  }
}
