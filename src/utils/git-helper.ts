import { info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'

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
    await exec('git', ['config', '--global', 'user.name', 'tdesign-bot'])
    await exec('git', ['config', '--global', 'user.email', 'tdesign@tencent.com'])
    await exec('git', ['config', '--global', `url.https://${this.token}@github.com/.insteadOf`, 'https://github.com/'])
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

  async commit(message: string) {
    await exec('git', ['commit', '-am', message, '--no-verify'], { cwd: this.repoPath })
  }

  async push(branch: string) {
    if (this.isDryRun()) {
      this.logDryRunInfo('git push', { branch })
      return
    }
    await exec('git', ['push', 'origin', branch], { cwd: this.repoPath })
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
