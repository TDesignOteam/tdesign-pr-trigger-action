import type { TriggerContext } from '../utils/trigger'
import type { TargetConfig } from './types'
import process from 'node:process'
import { info } from '@actions/core'
import { exec } from '@actions/exec'
import { corepackEnable, GitHelper, GithubHelper } from '../utils'

export interface ConflictRule {
  matches: (file: string) => boolean
  strategy: 'ours' | 'theirs'
}

export interface CommonUpdateOptions {
  conflictRules: ConflictRule[]
  afterMerge?: (repoPath: string, env: Record<string, string>) => Promise<void>
}

export interface SnapshotUpdateOptions {
  conflictRules: ConflictRule[]
  runSnapshot: (repoPath: string, env: Record<string, string>) => Promise<void>
}

const COMMON_PR_REG = /^\d+$/

async function prepare(context: TriggerContext, target: TargetConfig, recurseSubmodules = false) {
  const github = new GithubHelper({ owner: target.owner, repo: target.repo, token: context.token, dryRun: context.dry_run })
  const prData = await github.getPrData(context.pr_number)
  if (!prData.head.repo) {
    throw new Error(`PR #${context.pr_number} 的来源仓库已被删除`)
  }
  const git = new GitHelper({ owner: target.owner, repo: target.repo, token: context.token, dryRun: context.dry_run })
  await git.clone()
  await git.checkoutPullRequest(context.pr_number, {
    branch: prData.head.ref,
    cloneUrl: prData.head.repo.clone_url,
    isFork: prData.head.repo.full_name !== prData.base.repo.full_name,
  }, recurseSubmodules)
  return git
}

async function resolveMerge(git: GitHelper, rules: ConflictRule[]) {
  const exitCode = await git.mergeDevelop()
  const conflicts = await git.getUnmergedFiles()
  if (exitCode !== 0 && !conflicts.length) {
    throw new Error('合并 develop 失败')
  }
  const unresolved = conflicts.filter(file => !rules.some(rule => rule.matches(file)))
  if (unresolved.length) {
    throw new Error(`存在未适配的冲突文件: ${unresolved.join(', ')}`)
  }
  for (const rule of rules) {
    await git.resolveConflicts(conflicts.filter(rule.matches), rule.strategy)
  }
}

async function commitAndPush(git: GitHelper, message: string) {
  if (await git.isNeedCommit()) {
    await git.commitAll(message)
  }
  else {
    info('nothing to commit')
  }
  await git.pushCurrent()
}

async function notify(context: TriggerContext, target: TargetConfig, message: string) {
  const github = new GithubHelper({ owner: target.owner, repo: target.repo, token: context.token, dryRun: context.dry_run })
  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${target.owner}/${target.repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : ''
  await github.addComment(context.pr_number, runUrl ? `${message} CI: [Open](${runUrl})` : message)
}

export function createRepositoryEnv(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const env = Object.fromEntries(Object.entries(source).filter((entry): entry is [string, string] => entry[1] !== undefined))
  delete env.INPUT_TOKEN
  delete env.GITHUB_TOKEN
  delete env.GH_TOKEN
  return env
}

export async function installDependencies(target: TargetConfig, env: Record<string, string>) {
  if (target.packageManager === 'pnpm') {
    await corepackEnable()
  }
  await exec(target.packageManager, ['install'], { cwd: `./${target.repo}`, env })
}

export async function updateCurrentCommon(context: TriggerContext, target: TargetConfig, options: CommonUpdateOptions): Promise<void> {
  const git = await prepare(context, target)
  const commonPrNumber = context.args[0]
  if (commonPrNumber && !COMMON_PR_REG.test(commonPrNumber)) {
    throw new Error('/update-common 的参数必须是 common PR number')
  }
  if (commonPrNumber) {
    await git.updateSubmoduleToPullRequest(Number(commonPrNumber), target.commonPath)
  }
  else {
    await git.updateSubmodulePath(target.commonPath)
  }
  if (await git.isNeedCommit()) {
    await git.commitAll(commonPrNumber ? `chore: update common to PR ${commonPrNumber}` : 'chore: update common')
  }
  await resolveMerge(git, options.conflictRules)
  await options.afterMerge?.(`./${target.repo}`, createRepositoryEnv())
  await commitAndPush(git, 'chore: merge develop')
}

export async function updateCurrentAiCore(context: TriggerContext, target: TargetConfig, conflictRules: ConflictRule[]): Promise<void> {
  const git = await prepare(context, target)
  await git.updateSubmodulePath('packages/ai-core')
  if (await git.isNeedCommit()) {
    await git.commitAll('chore: update ai-core')
  }
  await resolveMerge(git, conflictRules)
  await commitAndPush(git, 'chore: merge develop')
}

export async function updateCurrentSnapshot(context: TriggerContext, target: TargetConfig, options: SnapshotUpdateOptions): Promise<void> {
  const git = await prepare(context, target, true)
  await resolveMerge(git, options.conflictRules)
  await notify(context, target, '⏳ 正在运行快照更新。。。')
  const env = createRepositoryEnv()
  await installDependencies(target, env)
  await options.runSnapshot(`./${target.repo}`, env)
  await commitAndPush(git, 'chore: update snapshot')
}

export async function updateCurrentCoverage(context: TriggerContext, target: TargetConfig): Promise<void> {
  const git = await prepare(context, target, true)
  await notify(context, target, '⏳ 正在运行 coverage badge 更新。。。')
  const env = createRepositoryEnv()
  await installDependencies(target, env)
  for (const args of target.coverageCommands) {
    await exec(target.packageManager, args, { cwd: `./${target.repo}`, env })
  }
  await commitAndPush(git, 'chore: update coverage badge')
}
