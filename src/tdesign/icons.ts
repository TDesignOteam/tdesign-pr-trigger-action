import type { TriggerContext } from '../utils/trigger'
import type { TargetConfig } from './types'
import { endGroup, info, startGroup } from '@actions/core'
import { exec } from '@actions/exec'
import { adaptChangelogForRepo, addContributor, bumpIconsVersion, corepackEnable, getPkgLatestVersion, GitHelper, GithubHelper } from '../utils'

export const CND_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/

export async function getCdnIconfontVersion(): Promise<string> {
  const res = await fetch('https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/src/iconfont/icon.tsx')
  const text = await res.text()
  const match = text.match(CND_ICONFONT_VERSION_REG)
  return match?.[1] || ''
}

async function miniprogramUpdateIcons(repo: string, version: string) {
  await exec('node', ['./script/update-icons.mjs', '--version', version], { cwd: `./${repo}` })
  await exec('git', ['status'], { cwd: `./${repo}` })
}

export default async function updateIcons(context: TriggerContext, target: TargetConfig): Promise<void | boolean> {
  const githubHelper = new GithubHelper({ repo: context.repo, owner: context.owner, token: context.token, dryRun: context.dry_run })
  const prData = await githubHelper.getPrData(context.pr_number)
  const body = adaptChangelogForRepo(addContributor(prData.body || '', prData.user.login), target.repo)

  startGroup('body')
  info(body)
  endGroup()
  startGroup(target.iconPackage)
  const latestVersion = target.iconPackage === 'cdn-iconfont' ? await getCdnIconfontVersion() : await getPkgLatestVersion(target.iconPackage)
  info(`latestVersion: ${latestVersion}`)
  endGroup()

  const gitHelper = new GitHelper({ repo: target.repo, owner: target.owner, token: context.token, dryRun: context.dry_run })
  await gitHelper.clone()
  await gitHelper.initSubmodule()
  if (target.packageManager === 'pnpm') {
    await corepackEnable()
  }
  await exec(target.packageManager, ['install'], { cwd: `./${target.repo}` })
  const branchName = `chore/icon/${target.iconPackage}/${latestVersion}`
  await gitHelper.createBranch(branchName)
  await bumpIconsVersion(target.packageManager, target.repo)
  if (target.iconPackage === 'cdn-iconfont') {
    await miniprogramUpdateIcons(target.repo, latestVersion)
  }
  if (!await gitHelper.isNeedCommit()) {
    return true
  }

  const title = `feat(Icon): upgrade ${target.iconPackage} to ${latestVersion}`
  await gitHelper.commit(title)
  const updateSnapScript = target.iconPackage === 'cdn-iconfont' ? 'test:snap-update' : 'test:update'
  if (target.repo === 'tdesign-vue-next') {
    await exec(target.packageManager, ['-F', '@tdesign/vue-next-test', 'run', updateSnapScript], { cwd: `./${target.repo}` })
  }
  else {
    await exec(target.packageManager, ['run', updateSnapScript], { cwd: `./${target.repo}` })
  }
  if (await gitHelper.isNeedCommit()) {
    await gitHelper.commit('chore: update snapshot')
  }
  await gitHelper.push(branchName)

  const targetGithub = new GithubHelper({ repo: target.repo, owner: target.owner, token: context.token, dryRun: context.dry_run })
  await targetGithub.createPR(title, branchName, body)
}
