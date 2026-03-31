import type { AutoPrTrigger, TdesignRepo, Trigger } from '../config/mapping'
import { getInput, info } from '@actions/core'
import { exec } from '@actions/exec'
import { getClient } from 'node-cnb'
import { BRANCH_PATTERNS, PR_LABELS, PR_TITLES } from '../config/constants'
import { getSource } from '../config/mapping'
import commonStart from '../tdesign/common'
import iconStart from '../tdesign/icons'
import { corepackEnable, getPkgLatestVersion } from './common'
import { ActionError } from './error-handler'
import { GitHelper } from './git-helper'
import { GithubHelper } from './github-helper'

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
