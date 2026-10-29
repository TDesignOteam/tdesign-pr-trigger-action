import { info, warning } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'

export interface GitContext {
  owner: string
  repo: string
  token: string
  dryRun: boolean
}

export interface MergeConflictStrategy {
  submodule?: 'ours' | 'theirs'
  snapshot?: 'ours' | 'theirs'
  snapshotFiles?: string[]
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

  private async initConfig() {
    await exec('git', [
      'config',
      '--global',
      'user.name',
      'tdesign-bot',
    ])
    await exec('git', [
      'config',
      '--global',
      'user.email',
      'tdesign@tencent.com',
    ])
    await exec('git', [
      'config',
      '--global',
      `url.https://${this.token}@github.com/.insteadOf`,
      'https://github.com/',
    ])
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

  async checkout(branch: string) {
    await exec('git', ['checkout', branch], { cwd: this.repoPath })
  }

  async fetch() {
    await exec('git', ['fetch', 'origin'], { cwd: this.repoPath })
  }

  async merge(branch: string) {
    try {
      const { stdout } = await getExecOutput('git', ['merge', branch], { cwd: this.repoPath })
      return stdout
    }
    catch (err: any) {
      throw new Error(`git merge ${branch} 失败，可能存在冲突，请手动处理: ${err.message}`)
    }
  }

  async commit(message: string) {
    await exec('git', [
      'commit',
      '-am',
      message,
      '--no-verify',
    ], { cwd: this.repoPath })
  }

  async commitAll(message: string) {
    await exec('git', ['add', '.'], { cwd: this.repoPath })
    await exec('git', ['commit', '-m', message, '--no-verify'], { cwd: this.repoPath })
  }

  async push(branch: string) {
    if (this.dryRun) {
      info('dry-run模式, 不运行git push')
      return
    }
    await exec('git', ['push', 'origin', branch], { cwd: this.repoPath })
  }

  async initSubmodule() {
    await exec('git', [
      'submodule',
      'update',
      '--init',
      '--recursive',
    ], { cwd: this.repoPath })
  }

  async updateSubmodule() {
    await exec('git', ['submodule', 'update', '--remote'], { cwd: this.repoPath })
  }

  async fetchPullRequestHead(prNumber: number, branch: string) {
    await exec('git', ['fetch', 'origin', `pull/${prNumber}/head:${branch}`], { cwd: this.repoPath })
    await exec('git', ['checkout', branch], { cwd: this.repoPath })
  }

  async pushToRepo(ownerRepo: string, branch: string, options?: { ignoreError?: boolean }) {
    if (this.dryRun) {
      info('dry-run模式, 不运行git push')
      return
    }
    try {
      await exec('git', ['push', `https://github.com/${ownerRepo}.git`, `HEAD:${branch}`], { cwd: this.repoPath })
    }
    catch (err: any) {
      if (options?.ignoreError) {
        warning(`git push 失败(已忽略): ${err.message}`)
        return
      }
      throw err
    }
  }

  async checkoutSubmodulePr(submodulePath: string, prNumber: number) {
    const subPath = `${this.repoPath}/${submodulePath}`
    await exec('git', ['fetch', 'origin', `pull/${prNumber}/head:refs/heads/pr-${prNumber}`], { cwd: subPath })
    await exec('git', ['checkout', `pr-${prNumber}`], { cwd: subPath })
  }

  async mergeWithStrategy(branch: string, strategy: MergeConflictStrategy) {
    try {
      await exec('git', ['merge', branch, '--no-commit'], { cwd: this.repoPath })
    }
    catch (err: any) {
      const conflictedPaths = await this.getConflictedPaths()
      if (conflictedPaths.length === 0) {
        throw new Error(`git merge ${branch} 失败，可能存在冲突，请手动处理: ${err.message}`)
      }
      const submodulePaths = await this.getSubmodulePaths()
      for (const path of conflictedPaths) {
        if (submodulePaths.includes(path)) {
          if (!strategy.submodule) {
            throw new Error(`git merge ${branch} 存在无法自动处理的冲突: ${path}`)
          }
          const stage = strategy.submodule === 'ours' ? 2 : 3
          const { stdout } = await getExecOutput('git', ['rev-parse', `:${stage}:${path}`], { cwd: this.repoPath })
          await exec('git', ['update-index', '--cacheinfo', '160000', stdout.trim(), path], { cwd: this.repoPath })
        }
        else if ((strategy.snapshotFiles ? strategy.snapshotFiles.includes(path) : path.endsWith('.snap')) && strategy.snapshot) {
          const flag = strategy.snapshot === 'theirs' ? '--theirs' : '--ours'
          await exec('git', ['checkout', flag, '--', path], { cwd: this.repoPath })
          await exec('git', ['add', path], { cwd: this.repoPath })
        }
        else {
          throw new Error(`git merge ${branch} 存在无法自动处理的冲突: ${path}`)
        }
      }
      info(`合并冲突已按策略解决: ${conflictedPaths.join(', ')}`)
    }
    if (await this.isNeedCommit()) {
      await this.commitAll('chore: merge develop')
    }
  }

  private async getConflictedPaths(): Promise<string[]> {
    const { stdout } = await getExecOutput('git', ['diff', '--name-only', '--diff-filter=U'], { cwd: this.repoPath })
    return stdout.split('\n').map(item => item.trim()).filter(Boolean)
  }

  async getSubmodulePaths(): Promise<string[]> {
    const { stdout } = await getExecOutput('git', ['config', '--file', '.gitmodules', '--get-regexp', 'path'], { cwd: this.repoPath, ignoreReturnCode: true })
    return stdout.split('\n').map(item => item.trim().split(/\s+/)[1]).filter(Boolean)
  }

  async isNeedCommit() {
    const { stdout } = await getExecOutput('git', ['status'], { cwd: this.repoPath })
    return !stdout.includes('nothing to commit, working tree clean')
  }

  async printDiff() {
    await exec('git', ['diff'], { cwd: this.repoPath })
  }
}
