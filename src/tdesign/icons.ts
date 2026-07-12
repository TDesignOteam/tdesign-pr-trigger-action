import type { AutoPrTrigger, TdesignRepo, TriggerContext } from '../utils/trigger'
import { endGroup, info, startGroup } from '@actions/core'
import { exec } from '@actions/exec'
import { adaptChangelogForRepo, addContributor, bumpIconsVersion, corepackEnable, getPkgLatestVersion, GitHelper, GithubHelper } from '../utils'
import { iconsMap, ownerMap, packageManagerMap, repoMap } from '../utils/trigger'

export const CDN_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/

export async function getCdnIconfontVersion(): Promise<string> {
  const res = await fetch('https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/src/iconfont/icon.tsx')
  if (!res.ok) {
    throw new Error(`获取 cdn-iconfont 版本失败: HTTP ${res.status}`)
  }
  const text = await res.text()
  const match = text.match(CDN_ICONFONT_VERSION_REG)
  if (!match) {
    throw new Error('无法从 tdesign-icons 源码解析 cdn-iconfont 版本')
  }
  return match[1]
}

async function miniprogramUpdateIcons(repo: string, version: string) {
  await exec('node', ['./script/update-icons.mjs', '--version', version], { cwd: `./${repo}` })
}

export default async function start(context: TriggerContext) {
  if (!Reflect.has(repoMap, context.trigger)) {
    throw new Error(`错误的 trigger: ${context.trigger}`)
  }
  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const prData = await githubHelper.getPrData(context.pr_number)
  let body = addContributor(prData.body || '', prData.user.login)
  const trigger = context.trigger as AutoPrTrigger
  body = adaptChangelogForRepo(body, repoMap[trigger])
  startGroup('body')
  info(`${body}`)
  endGroup()
  const packageName = iconsMap[trigger]
  startGroup(packageName)
  const latestVersion = packageName === 'cdn-iconfont'
    ? await getCdnIconfontVersion()
    : await getPkgLatestVersion(packageName)

  info(`latestVersion: ${latestVersion}`)
  endGroup()
  const gitHelper = new GitHelper({
    repo: repoMap[trigger],
    owner: ownerMap[trigger],
    token: context.token,
    dryRun: context.dry_run,
  })
  await gitHelper.clone()
  await gitHelper.initSubmodule()
  const packageManager = packageManagerMap[repoMap[trigger] as TdesignRepo]
  if (packageManager === 'pnpm') {
    await corepackEnable()
  }
  await exec(packageManager, ['install'], { cwd: `./${repoMap[trigger]}` })
  const branchName = `chore/icon/${packageName}/${latestVersion}`
  await gitHelper.createBranch(branchName)

  await bumpIconsVersion(packageManager, repoMap[trigger])
  if (packageName === 'cdn-iconfont') {
    await miniprogramUpdateIcons(repoMap[trigger], latestVersion)
  }
  if (!await gitHelper.isNeedCommit()) {
    return true
  }
  const title = `feat(Icon): upgrade ${packageName} to ${latestVersion}`
  await gitHelper.commit(title)

  const updateSnapScript = packageName === 'cdn-iconfont' ? 'test:snap-update' : 'test:update'
  if (repoMap[trigger] === 'tdesign-vue-next') {
    await exec(packageManager, ['-F', '@tdesign/vue-next-test', 'run', updateSnapScript], { cwd: `./${repoMap[trigger]}` })
  }
  else {
    await exec(packageManager, ['run', updateSnapScript], { cwd: `./${repoMap[trigger]}` })
  }

  if (await gitHelper.isNeedCommit()) {
    await gitHelper.commit('chore: update snapshot')
  }

  await gitHelper.push(branchName)

  const targetGithub = new GithubHelper({
    repo: repoMap[trigger],
    owner: ownerMap[trigger],
    token: context.token,
    dryRun: context.dry_run,
  })
  await targetGithub.createPR(title, branchName, body)
};
