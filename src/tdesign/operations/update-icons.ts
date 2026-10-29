import type { TriggerContext } from '../../commands/types'
import type { RepoCommandConfig } from './repo-config'
import { endGroup, info, startGroup } from '@actions/core'
import { exec } from '@actions/exec'
import { targetRepoProfiles } from '../../commands/definitions'
import { adaptChangelogForRepo, addContributor, bumpIconsVersion, corepackEnable, getPkgLatestVersion, GitHelper, GithubHelper } from '../../utils'

export const CND_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/

export async function getCdnIconfontVersion(): Promise<string> {
  const res = await fetch(`https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/src/iconfont/icon.tsx`)
  const text = await res.text()

  const match = text.match(CND_ICONFONT_VERSION_REG)
  return match?.[1] || ''
}
async function miniprogramUpdateIcons(repo: string, version: string) {
  await exec('node', ['./script/update-icons.mjs', '--version', version], { cwd: `./${repo}` })
  await exec('git', ['status'], { cwd: `./${repo}` })
}

export async function createIconsUpdatePr(context: TriggerContext, config: RepoCommandConfig) {
  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const prData = await githubHelper.getPrData(context.pr_number)
  if (!prData.merged) {
    info('pr has been merged')
    githubHelper.addComment(context.pr_number, 'PR 还没合并，无法触发')
    return
  }
  const link = `([icons#${context.pr_number}](https://github.com/Tencent/tdesign-icons/pull/${context.pr_number}))`
  let body = addContributor(prData.body || '', prData.user.login, link)
  const targetRepo = config.targetRepo
  const { owner, packageManager } = targetRepoProfiles[targetRepo]
  body = adaptChangelogForRepo(body, targetRepo)
  startGroup('body')
  info(`${body}`)
  endGroup()
  const packageName = config.iconsPackage
  if (!packageName) {
    throw new Error(`${targetRepo} 未配置 iconsPackage`)
  }
  startGroup(packageName)
  let latestVersion = ''
  if (packageName === 'cdn-iconfont') {
    latestVersion = await getCdnIconfontVersion()
  }
  else {
    latestVersion = await getPkgLatestVersion(packageName)
  }

  info(`latestVersion: ${latestVersion}`)
  endGroup()
  const gitHelper = new GitHelper({
    repo: targetRepo,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  await gitHelper.clone()
  await gitHelper.initSubmodule()
  if (packageManager === 'pnpm') {
    await corepackEnable()
  }
  await exec(packageManager, ['install'], { cwd: `./${targetRepo}` })
  const branchName = `chore/icon/${packageName}/${latestVersion}`
  await gitHelper.createBranch(branchName)

  await bumpIconsVersion(packageManager, targetRepo)
  if (packageName === 'cdn-iconfont') {
    await miniprogramUpdateIcons(targetRepo, latestVersion)
  }
  if (!await gitHelper.isNeedCommit()) {
    githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n \r\n icons 已是最新版本，无需升级`)
    return true
  }
  const title = `feat(Icon): upgrade ${packageName} to ${latestVersion}`
  await gitHelper.commit(title)

  const updateSnapScript = packageName === 'cdn-iconfont'
    ? 'test:snap-update'
    : 'test:update'

  if (targetRepo === 'tdesign-vue-next') {
    await exec(packageManager, [
      '-F',
      '@tdesign/vue-next-test',
      'run',
      updateSnapScript,
    ], { cwd: `./${targetRepo}` })
  }
  else {
    await exec(packageManager, ['run', updateSnapScript], { cwd: `./${targetRepo}` })
  }

  if (await gitHelper.isNeedCommit()) {
    await gitHelper.commit('chore: update snapshot')
  }

  await gitHelper.push(branchName)

  const targetRepoHelper = new GithubHelper({
    repo: targetRepo,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const newPrData = await targetRepoHelper.createPR(title, branchName, body)
  if (newPrData) {
    githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n \r\n 创建 PR 成功， 请查看 ${newPrData.html_url}`)
  }
}
