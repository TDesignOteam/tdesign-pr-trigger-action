import { error, getInput } from '@actions/core'
import { exec } from '@actions/exec'
import { getClient } from 'node-cnb'
import commonStart from '../tdesign/common'
import iconStart from '../tdesign/icons'
import { corepackEnable, getPkgLatestVersion } from './common'
import { GitHelper } from './git-helper'
import { GithubHelper } from './github-helper'

export type AutoPrTrigger = '/pr-vue' | '/pr-vue-next' | '/pr-react' | '/pr-mobile-vue' | '/pr-mobile-react' | '/pr-miniprogram'
export type Trigger = AutoPrTrigger | '/upgrade-deps' | '/delete-cnb-branch'
export type TdesignRepo = 'tdesign-vue' | 'tdesign-vue-next' | 'tdesign-react' | 'tdesign-mobile-vue' | 'tdesign-mobile-react' | 'tdesign-miniprogram'

export const iconsMap: Record<AutoPrTrigger, string> = {
  '/pr-vue': 'tdesign-icons-vue',
  '/pr-vue-next': 'tdesign-icons-vue-next',
  '/pr-react': 'tdesign-icons-react',
  '/pr-mobile-vue': 'tdesign-icons-vue-next',
  '/pr-mobile-react': 'tdesign-icons-react',
  '/pr-miniprogram': 'cdn-iconfont',
}
export const repoMap: Record<AutoPrTrigger, string> = {
  '/pr-vue': 'tdesign-vue',
  '/pr-vue-next': 'tdesign-vue-next',
  '/pr-react': 'tdesign-react',
  '/pr-mobile-vue': 'tdesign-mobile-vue',
  '/pr-mobile-react': 'tdesign-mobile-react',
  '/pr-miniprogram': 'tdesign-miniprogram',
}
export const ownerMap: Record<AutoPrTrigger, string> = {
  '/pr-vue': 'Tencent',
  '/pr-vue-next': 'Tencent',
  '/pr-react': 'Tencent',
  '/pr-mobile-vue': 'Tencent',
  '/pr-mobile-react': 'Tencent',
  '/pr-miniprogram': 'Tencent',
}

export const packageManagerMap: Record<TdesignRepo, string> = {
  'tdesign-vue': 'npm',
  'tdesign-vue-next': 'pnpm',
  'tdesign-react': 'pnpm',
  'tdesign-mobile-vue': 'npm',
  'tdesign-mobile-react': 'npm',
  'tdesign-miniprogram': 'npm',
}

export interface TriggerContext {
  owner: string
  repo: string
  pr_number: number
  token: string
  trigger: Trigger
  dry_run: boolean
}
export default function useTrigger(context: TriggerContext) {
  // TODO
  switch (context.trigger) {
    case '/pr-vue':
    case '/pr-vue-next':
    case '/pr-react':
    case '/pr-mobile-vue':
    case '/pr-mobile-react':
    case '/pr-miniprogram':
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
  switch (context.repo) {
    case 'tdesign-icons':
      iconStart(context)
      break
    case 'tdesign-common':
      commonStart(context)
      break
    default:
      throw new Error(`该仓库未适配: ${context.repo}`)
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
  const branchName = `chore/deps/${deps}/${latestVersion}`
  await gitHelper.createBranch(branchName)
  if (packageManager === 'pnpm') {
    await exec('pnpm', ['--recursive', 'update', deps, '--latest'], { cwd: `./${context.repo}` })
  }
  else {
    await exec('npx', ['npm-check-updates', deps, '-u'], { cwd: `./${context.repo}` })
  }

  if (!await gitHelper.isNeedCommit()) {
    return true
  }

  const title = `chore(deps): upgrade ${deps} to ${latestVersion}`
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
    await githubHelper.addLabels(prData.number, ['skip-changelog'])
  }
}

async function deleteCnbBranch(context: TriggerContext) {
  const branch = getInput('branch', { required: true })
  const client = getClient('https://api.cnb.cool', context.token)
  if (!client) {
    error('token 无效')
  }
  try {
    await client.repo.git.branches.delete({ repo: context.repo, branch })
  }
  catch (err: any) {
    throw new Error(`删除分支失败: ${err.response?.data || err.message}`)
  }
}
