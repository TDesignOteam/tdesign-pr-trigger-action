import type { AutoPrTrigger, TdesignRepo, Trigger } from '../config/mapping'
import { getInput, info } from '@actions/core'
import { exec } from '@actions/exec'
import { getClient } from 'node-cnb'
import { BRANCH_PATTERNS, PR_LABELS, PR_TITLES, SNAPSHOT_CONFLICT_PATTERNS, SNAPSHOT_SCRIPTS } from '../config/constants'
import { getSource } from '../config/mapping'
import commonStart from '../tdesign/common'
import iconStart from '../tdesign/icons'
import { corepackEnable, getPkgLatestVersion } from './common'
import { ActionError } from './error-handler'
import { GitHelper } from './git-helper'
import { GithubHelper } from './github-helper'

// Regex for parsing package manager commands
const PACKAGE_MANAGER_REG = /^(npm|pnpm|yarn) run (.+)$/

export { TdesignRepo }

export interface TriggerContext {
  owner: string
  repo: string
  pr_number: number
  token: string
  trigger: Trigger
  dry_run: boolean
}

// Trigger type constants
const AUTO_PR_TRIGGERS: AutoPrTrigger[] = [
  '/pr-vue',
  '/pr-vue-next',
  '/pr-react',
  '/pr-mobile-vue',
  '/pr-mobile-react',
  '/pr-miniprogram',
  '/pr-tdesign',
  '/update-common',
  '/update-snapshot',
] as const

const CNB_API_URL = 'https://api.cnb.cool'

// Error messages
const ERROR_MESSAGES = {
  UNSUPPORTED_TRIGGER: (trigger: string) => `未支持的触发器: ${trigger}`,
  INVALID_TRIGGER_SOURCE: (trigger: string) => `无法获取触发源: ${trigger}`,
  UNKNOWN_TRIGGER_SOURCE: (source: string) => `未知的触发源: ${source}`,
  MISSING_DEPS: '请指定需要升级的依赖',
  INVALID_TOKEN: 'token 无效',
  DELETE_BRANCH_SUCCESS: (data: unknown) => `删除分支成功:${JSON.stringify(data)}`,
  DELETE_BRANCH_FAILED: (err: unknown) => {
    const response = (err as any).response?.data
    const message = (err as Error).message
    return `删除分支失败: ${response ? JSON.stringify(response) : message}`
  },
} as const

function isAutoPrTrigger(trigger: Trigger): trigger is AutoPrTrigger {
  return AUTO_PR_TRIGGERS.includes(trigger as AutoPrTrigger)
}

interface PrData {
  merged: boolean
  head: {
    ref: string
    user: {
      login: string
    }
    repo?: {
      id: number
      clone_url: string
    }
  }
  base: {
    ref: string
    repo: {
      id: number
    }
  }
}

function isForkPr(prData: PrData): boolean {
  return prData.head.repo?.id !== prData.base.repo.id
}

type SelfUpdateType = 'submodule' | 'snapshot'

async function selfUpdate(context: TriggerContext): Promise<void> {
  const type: SelfUpdateType = context.trigger === '/update-snapshot' ? 'snapshot' : 'submodule'
  await selfUpdateWithType(context, type)
}

async function selfUpdateWithType(context: TriggerContext, type: SelfUpdateType): Promise<void> {
  // 自身仓库更新场景: 在当前 PR 上评论触发，更新子模块或快照
  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })

  const prData = await githubHelper.getPrData(context.pr_number) as PrData
  if (!prData.merged) {
    info('PR has not been merged yet')
    await githubHelper.addComment(context.pr_number, 'PR 还没合并，无法触发')
    return
  }

  const gitHelper = new GitHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })

  await gitHelper.clone()

  const prBranch = prData.head.ref
  const forkOwner = prData.head.user.login
  const isFork = isForkPr(prData)

  // Fork PR: 添加远程仓库并检出 fork 的分支
  if (isFork) {
    const forkRepoUrl = prData.head.repo?.clone_url || `https://github.com/${forkOwner}/${context.repo}.git`
    await gitHelper.addRemote(forkOwner, forkRepoUrl)
    await gitHelper.checkoutPr(context.pr_number)
    await gitHelper.setUpstream(forkOwner, prBranch)
  }
  else {
    await gitHelper.checkoutBranch(prBranch)
  }

  // 子模块更新
  if (type === 'submodule') {
    await gitHelper.initSubmodule()
    await gitHelper.updateSubmodule()
  }

  // 合并 develop 分支
  await gitHelper.mergeDevelop()

  // 处理冲突
  await handleSelfUpdateConflicts(gitHelper, context.repo, type)

  // 快照更新
  if (type === 'snapshot') {
    const snapshotScript = getSnapshotScript(context.repo)
    const exitCode = await runSnapshotScript(snapshotScript, context.repo)

    if (exitCode !== 0) {
      await githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n\r\n❌ 快照更新失败，请检查测试用例`)
      return
    }
  }

  if (!await gitHelper.isNeedCommit()) {
    const msg = type === 'submodule'
      ? 'common 子模块已是最新版本，无需更新'
      : '快照已是最新版本，无需更新'
    await githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n\r\n✅ ${msg}`)
    return
  }

  const title = type === 'submodule' ? PR_TITLES.SUBMODULE : PR_TITLES.SNAPSHOT
  await gitHelper.commit(title)
  await gitHelper.push(prBranch, isFork ? forkOwner : undefined)

  const successMsg = type === 'submodule'
    ? '已更新 common 子模块，请合并该分支'
    : '已更新快照，请合并该分支'
  await githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n\r\n✅ ${successMsg}`)
}

function getSnapshotScript(repo: string): string | string[] {
  return SNAPSHOT_SCRIPTS[repo] || SNAPSHOT_SCRIPTS.DEFAULT
}

async function runSnapshotScript(script: string | string[], repo: string): Promise<number> {
  const cwd = `./${repo}`
  if (Array.isArray(script)) {
    const [cmd, ...args] = script
    return exec(cmd, args, { cwd })
  }
  // Handle "npm run xxx" or "pnpm run xxx" format
  const match = script.match(PACKAGE_MANAGER_REG)
  if (match) {
    return exec(match[1], ['run', match[2]], { cwd })
  }
  return exec('npm', ['run', script], { cwd })
}

async function handleSelfUpdateConflicts(gitHelper: GitHelper, repo: string, type: SelfUpdateType): Promise<void> {
  const cwd = `./${repo}`
  const conflictFiles = await gitHelper.getConflictFiles()

  if (conflictFiles.length === 0) {
    return
  }

  info(`Found ${conflictFiles.length} conflict files`)

  // Snapshot update only handles snapshot-related conflicts
  if (type === 'snapshot') {
    const hasUnknownConflict = conflictFiles.some(
      file => !SNAPSHOT_CONFLICT_PATTERNS.some(pattern => file.includes(pattern)),
    )

    if (hasUnknownConflict) {
      throw new ActionError('发现未知的冲突文件，请手动处理', { conflictFiles })
    }
  }

  // Resolve conflicts based on type
  for (const file of conflictFiles) {
    if (file.includes('packages/common')) {
      // For common submodule, use --ours (keep current branch's version)
      await exec('git', ['checkout', '--ours', file], { cwd })
      await exec('git', ['add', file], { cwd })
      info(`Resolved conflict for ${file} using --ours`)
    }
    else {
      // For snapshot files, use --theirs (take develop's version, then snapshot update will regenerate)
      await exec('git', ['checkout', '--theirs', file], { cwd })
      await exec('git', ['add', file], { cwd })
      info(`Resolved conflict for ${file} using --theirs`)
    }
  }

  // Commit the merge
  await exec('git', ['commit', '-am', 'chore: merge develop'], { cwd })
}

function executeAutoPr(context: TriggerContext): void {
  const source = getSource(context.trigger as AutoPrTrigger)

  if (!source) {
    throw new ActionError(ERROR_MESSAGES.INVALID_TRIGGER_SOURCE(context.trigger), { trigger: context.trigger })
  }

  switch (source) {
    case 'common':
      commonStart(context)
      break
    case 'icons':
      iconStart(context)
      break
    case 'self':
      selfUpdate(context)
      break
    default:
      throw new ActionError(ERROR_MESSAGES.UNKNOWN_TRIGGER_SOURCE(source), { source })
  }
}

async function updateDependencies(context: TriggerContext): Promise<void> {
  const deps = getInput('deps')
  const packageManager = getInput('package-manager') || 'npm'

  if (!deps) {
    throw new ActionError(ERROR_MESSAGES.MISSING_DEPS, { trigger: context.trigger })
  }

  const latestVersion = await getPkgLatestVersion(deps)

  if (packageManager !== 'npm') {
    await corepackEnable()
  }

  const gitHelper = new GitHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })

  const baseBranch = await gitHelper.clone()
  const branchName = BRANCH_PATTERNS.DEPS(deps, latestVersion)
  await gitHelper.createBranch(branchName)

  await updatePackageDependencies(packageManager, deps, context.repo)

  if (!await gitHelper.isNeedCommit()) {
    return
  }

  const title = PR_TITLES.DEPS(deps, latestVersion)
  await gitHelper.commit(title)
  await gitHelper.push(branchName)

  await createDepsPr(gitHelper, title, branchName, baseBranch, context)
}

async function updatePackageDependencies(packageManager: string, deps: string, repo: string): Promise<void> {
  if (packageManager === 'pnpm') {
    await exec('pnpm', ['--recursive', 'update', deps, '--latest'], { cwd: `./${repo}` })
  }
  else {
    await exec('npx', ['npm-check-updates', deps, '-u'], { cwd: `./${repo}` })
  }
}

async function createDepsPr(
  gitHelper: GitHelper,
  title: string,
  branchName: string,
  baseBranch: string,
  context: TriggerContext,
): Promise<void> {
  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })

  const prData = await githubHelper.createPR(title, branchName, title, baseBranch)
  if (prData) {
    await githubHelper.addLabels(prData.number, [PR_LABELS.SKIP_CHANGELOG])
  }
}

async function deleteCnbBranch(context: TriggerContext): Promise<void> {
  const branch = getInput('branch', { required: true })
  const client = getClient(CNB_API_URL, context.token)

  if (!client) {
    throw new ActionError(ERROR_MESSAGES.INVALID_TOKEN, { trigger: context.trigger })
  }

  try {
    const res = await client.repo.git.branches.delete({ repo: context.repo, branch })
    info(ERROR_MESSAGES.DELETE_BRANCH_SUCCESS(res))
  }
  catch (err) {
    throw new ActionError(ERROR_MESSAGES.DELETE_BRANCH_FAILED(err), { trigger: context.trigger })
  }
}

export default function useTrigger(context: TriggerContext): void {
  switch (context.trigger) {
    case isAutoPrTrigger(context.trigger) ? context.trigger : null:
      executeAutoPr(context)
      break
    case '/upgrade-deps':
      updateDependencies(context)
      break
    case '/delete-cnb-branch':
      deleteCnbBranch(context)
      break
    default:
      throw new ActionError(ERROR_MESSAGES.UNSUPPORTED_TRIGGER(context.trigger), { trigger: context.trigger })
  }
}
