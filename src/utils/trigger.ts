import type { AutoPrTrigger, TdesignRepo, Trigger } from '../config/mapping'
import { getInput, info } from '@actions/core'
import { exec } from '@actions/exec'
import { getClient } from 'node-cnb'
import { BRANCH_PATTERNS, PR_LABELS, PR_TITLES } from '../config/constants'
import { getSource } from '../config/mapping'
import commonStart from '../tdesign/common'
import iconStart from '../tdesign/icons'
import { corepackEnable, getPkgLatestVersion } from './common'
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

export default function useTrigger(context: TriggerContext) {
  switch (context.trigger) {
    case '/pr-vue':
    case '/pr-vue-next':
    case '/pr-react':
    case '/pr-mobile-vue':
    case '/pr-mobile-react':
    case '/pr-miniprogram':
    case '/pr-tdesign':
      autoPR(context)
      break
    case '/upgrade-deps':
      upgradeDeps(context)
      break
    case '/delete-cnb-branch':
      deleteCnbBranch(context)
      break
    default:
      throw new Error(`未支持的触发器: ${context.trigger}`)
  }
}

function autoPR(context: TriggerContext) {
  const source = getSource(context.trigger as AutoPrTrigger)

  if (!source) {
    throw new Error(`无法获取触发源: ${context.trigger}`)
  }

  switch (source) {
    case 'common':
      commonStart(context)
      break
    case 'icons':
      iconStart(context)
      break
    default:
      throw new Error(`未知的触发源: ${source}`)
  }
}

async function upgradeDeps(context: TriggerContext) {
  const deps = getInput('deps')
  const packageManager = getInput('package-manager') || 'npm'

  if (!deps) {
    throw new Error('请指定需要升级的依赖')
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

  if (packageManager === 'pnpm') {
    await exec('pnpm', ['--recursive', 'update', deps, '--latest'], { cwd: `./${context.repo}` })
  }
  else {
    await exec('npx', ['npm-check-updates', deps, '-u'], { cwd: `./${context.repo}` })
  }

  if (!await gitHelper.isNeedCommit()) {
    return
  }

  const title = PR_TITLES.DEPS(deps, latestVersion)
  await gitHelper.commit(title)
  await gitHelper.push(branchName)

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

async function deleteCnbBranch(context: TriggerContext) {
  const branch = getInput('branch', { required: true })
  const client = getClient('https://api.cnb.cool', context.token)
  if (!client) {
    throw new Error('token 无效')
  }

  try {
    const res = await client.repo.git.branches.delete({ repo: context.repo, branch })
    info(`删除分支成功:${JSON.stringify(res)}`)
  }
  catch (err) {
    throw new Error(`删除分支失败: ${(err as any).response?.data ? JSON.stringify((err as any).response.data) : (err as Error).message}`)
  }
}
