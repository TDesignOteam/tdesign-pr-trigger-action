import { getInput } from '@actions/core'
import { exec } from '@actions/exec'
import commonStart from '../tdesign/common'
import iconStart from '../tdesign/icons'
import { corepackEnable } from './common'
import { GitHelper } from './git-helper'
import { GithubHelper } from './github-helper'

export const iconsMap = {
  '/pr-vue': 'tdesign-icons-vue',
  '/pr-vue-next': 'tdesign-icons-vue-next',
  '/pr-react': 'tdesign-icons-react',
  '/pr-mobile-vue': 'tdesign-icons-vue-next',
  '/pr-mobile-react': 'tdesign-icons-react',
  '/pr-miniprogram': 'cdn-iconfont',
}
export const repoMap = {
  '/pr-vue': 'tdesign-vue',
  '/pr-vue-next': 'tdesign-vue-next',
  '/pr-react': 'tdesign-react',
  '/pr-mobile-vue': 'tdesign-mobile-vue',
  '/pr-mobile-react': 'tdesign-mobile-react',
  '/pr-miniprogram': 'tdesign-miniprogram',
  '/pr-flutter': 'tdesign-flutter',
}
export const ownerMap = {
  '/pr-vue': 'Tencent',
  '/pr-vue-next': 'Tencent',
  '/pr-react': 'Tencent',
  '/pr-mobile-vue': 'Tencent',
  '/pr-mobile-react': 'Tencent',
  '/pr-miniprogram': 'Tencent',
  '/pr-flutter': 'Tencent',
}

export const packageManagerMap = {
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
  trigger: string
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
    default:
      throw new Error(`未支持的触发器: ${context.trigger}`)
  }
}

function autoPR(context) {
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

async function upgradeDeps(context) {
  const deps = getInput('deps')
  const packageManager = getInput('package-manager') || 'npm'

  if (!deps) {
    throw new Error('请指定需要升级的依赖')
  }

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
  const branchName = `chore/deps/${deps}`
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

  const title = `chore(deps): upgrade ${deps}`
  await gitHelper.commit(title)
  await gitHelper.push(branchName)

  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  await githubHelper.createPR(title, branchName, title, baseBranch)
}
