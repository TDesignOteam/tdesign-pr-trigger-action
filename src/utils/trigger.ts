import type { TargetModule, TargetRepo } from '../tdesign/types'
import { error, getInput, info } from '@actions/core'
import { exec } from '@actions/exec'
import { getClient } from 'node-cnb'
import miniprogram from '../tdesign/miniprogram'
import mobileReact from '../tdesign/mobile-react'
import mobileVue from '../tdesign/mobile-vue'
import react from '../tdesign/react'
import vue from '../tdesign/vue'
import vueNext from '../tdesign/vue-next'
import { corepackEnable, getPkgLatestVersion } from './common'
import { GitHelper } from './git-helper'
import { GithubHelper } from './github-helper'

export type AutoPrTrigger = '/pr-vue' | '/pr-vue-next' | '/pr-react' | '/pr-mobile-vue' | '/pr-mobile-react' | '/pr-miniprogram'
export type TdesignTrigger = '/update-common' | '/update-ai-core' | '/update-snapshot' | '/update-coverage'
export type Trigger = AutoPrTrigger | TdesignTrigger | '/upgrade-deps' | '/delete-cnb-branch'

const COMMAND_PARTS_REG = /\s+/

export interface TriggerContext {
  owner: string
  repo: string
  pr_number: number
  token: string
  trigger: Trigger
  args: string[]
  dry_run: boolean
}

const targetRoutes: Record<AutoPrTrigger, TargetModule> = {
  '/pr-vue': vue,
  '/pr-vue-next': vueNext,
  '/pr-react': react,
  '/pr-mobile-vue': mobileVue,
  '/pr-mobile-react': mobileReact,
  '/pr-miniprogram': miniprogram,
}

const repositoryRoutes: Record<TargetRepo, TargetModule> = {
  'tdesign-vue': vue,
  'tdesign-vue-next': vueNext,
  'tdesign-react': react,
  'tdesign-mobile-vue': mobileVue,
  'tdesign-mobile-react': mobileReact,
  'tdesign-miniprogram': miniprogram,
}

export function parseTrigger(value: string): Trigger {
  const trigger = value.trim().split(COMMAND_PARTS_REG)[0]
  if (trigger in targetRoutes || trigger === '/upgrade-deps' || trigger === '/delete-cnb-branch' || trigger === '/update-common' || trigger === '/update-ai-core' || trigger === '/update-snapshot' || trigger === '/update-coverage') {
    return trigger as Trigger
  }
  throw new Error(`未支持的触发器: ${trigger}`)
}

export function parseTriggerArgs(value: string): string[] {
  return value.trim().split(COMMAND_PARTS_REG).slice(1)
}

export function getTargetModule(trigger: AutoPrTrigger): TargetModule {
  return targetRoutes[trigger]
}

export function getTargetModuleByRepo(repo: string): TargetModule {
  const targetModule = repositoryRoutes[repo as TargetRepo]
  if (!targetModule) {
    throw new Error(`该仓库不支持当前 PR 更新指令: ${repo}`)
  }
  return targetModule
}

export default async function useTrigger(context: TriggerContext): Promise<void | boolean> {
  switch (context.trigger) {
    case '/pr-vue':
    case '/pr-vue-next':
    case '/pr-react':
    case '/pr-mobile-vue':
    case '/pr-mobile-react':
    case '/pr-miniprogram':
      return getTargetModule(context.trigger).run(context)
    case '/update-common':
      return getTargetModuleByRepo(context.repo).updateCommon(context)
    case '/update-snapshot':
      return getTargetModuleByRepo(context.repo).updateSnapshot(context)
    case '/update-coverage':
      return getTargetModuleByRepo(context.repo).updateCoverage(context)
    case '/update-ai-core': {
      const updateAiCore = getTargetModuleByRepo(context.repo).updateAiCore
      if (!updateAiCore) {
        throw new Error(`/update-ai-core 不支持仓库: ${context.repo}`)
      }
      return updateAiCore(context)
    }
    case '/upgrade-deps':
      return upgradeDeps(context)
    case '/delete-cnb-branch':
      return deleteCnbBranch(context)
  }
}

async function upgradeDeps(context: TriggerContext): Promise<void | boolean> {
  const deps = getInput('deps')
  const packageManager = getInput('package-manager') || 'npm'
  if (!deps) {
    throw new Error('请指定需要升级的依赖')
  }
  const latestVersion = await getPkgLatestVersion(deps)
  if (packageManager !== 'npm') {
    await corepackEnable()
  }

  const gitHelper = new GitHelper({ repo: context.repo, owner: context.owner, token: context.token, dryRun: context.dry_run })
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
  const githubHelper = new GithubHelper({ repo: context.repo, owner: context.owner, token: context.token, dryRun: context.dry_run })
  const prData = await githubHelper.createPR(title, branchName, title, baseBranch)
  if (prData) {
    await githubHelper.addLabels(prData.number, ['skip-changelog'])
  }
}

async function deleteCnbBranch(context: TriggerContext): Promise<void> {
  const branch = getInput('branch', { required: true })
  const client = getClient('https://api.cnb.cool', context.token)
  if (!client) {
    error('token 无效')
    throw new Error('token 无效')
  }
  try {
    const res = await client.repo.git.branches.delete({ repo: context.repo, branch })
    info(`删除分支成功:${JSON.stringify(res)}`)
  }
  catch (err: any) {
    throw new Error(`删除分支失败: ${JSON.stringify(err.response?.data) || err.message}`)
  }
}
