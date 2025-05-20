import { exec, getExecOutput } from '@actions/exec'

export interface GitContext {
  owner: string
  repo: string
  token: string
}
export class GitHelper {
  private token: string
  private owner: string
  private repo: string
  private repoPath: string

  constructor(context: GitContext) {
    this.token = context.token
    this.owner = context.owner
    this.repo = context.repo
    this.repoPath = `../${context.repo}`
    this.iniConfig()
  }

  private iniConfig() {
    exec('git', ['config', '--global', 'user.name', 'tdesign-action-bot'])
    exec('git', ['config', '--global', 'user.email', 'tdesign@tencent.com'])
    exec('git', ['config', '--global', `url.https://${this.token}@github.com/.insteadOf`, 'https://github.com/'])
  }

  private get repoUrl() {
    return `https://github.com/${this.owner}/${this.repo}.git`
  }

  async clone(branchName = 'develop') {
    await exec('git', ['clone', '-b', branchName, this.repoUrl, this.repoPath])
  }

  async createBranch(branch: string) {
    await exec('git', ['checkout', '-b', branch], { cwd: this.repoPath })
  }

  async commit(message: string) {
    await exec('git', ['commit', '-am', message, '--no-verify'], { cwd: this.repoPath })
  }

  async push(branch: string) {
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
}
