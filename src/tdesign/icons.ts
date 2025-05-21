import type { TriggerContext } from '../utils/trigger'
import { endGroup, info, startGroup } from '@actions/core'
import { exec } from '@actions/exec'
import { addContributor, bumpIconsVersion, corepackEnable, getPkgLatestVersion, GitHelper, GithubHelper } from 'src/utils'
import { iconsMap, ownerMap, packageManagerMap, repoMap } from '../utils/trigger'

export const CND_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/

export async function getCdnIconfontVersion(): Promise<string> {
  const res = await fetch(`https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/src/iconfont/icon.tsx`)
  const text = await res.text()

  const match = text.match(CND_ICONFONT_VERSION_REG)
  return match?.[1] || ''
}
async function miniprogramUpdateIcons(repo: string, version: string) {
  await exec('node', ['./script/update-icons.js', '--version', version], { cwd: `./${repo}` })
  await exec('git', ['status'], { cwd: `./${repo}` })
}
export default async function start(context: TriggerContext) {
  if (!Reflect.has(repoMap, context.trigger)) {
    info(`错误的trigger: ${context.trigger}`)
    return
  }
  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const prData = await githubHelper.getPrData(context.pr_number)
  const body = addContributor(prData.body || '', prData.user.login)
  startGroup('body')
  info(`${body}`)
  endGroup()
  const packageName = iconsMap[context.trigger]
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
    repo: repoMap[context.trigger],
    owner: ownerMap[context.trigger],
    token: context.token,
    dryRun: context.dry_run,
  })
  await gitHelper.clone()
  await gitHelper.initSubmodule()
  const packageManager = packageManagerMap[repoMap[context.trigger]]
  if (packageManager === 'pnpm') {
    await corepackEnable()
  }
  await exec(packageManager, ['install'], { cwd: `./${repoMap[context.trigger]}` })
  const branchName = `chore/icon/${packageName}/${latestVersion}`
  await gitHelper.createBranch(branchName)

  await bumpIconsVersion(packageManager, repoMap[context.trigger])
  if (packageName === 'cdn-iconfont') {
    await miniprogramUpdateIcons(repoMap[context.trigger], latestVersion)
  }
  if (!await gitHelper.isNeedCommit()) {
    return true
  }
  const title = `feat(Icon): upgrade ${packageName} to ${latestVersion}`
  await gitHelper.commit(title)

  const updateSnapScript = packageName === 'cdn-iconfont' ? 'test:snap-update' : 'test:update'
  await exec(packageManager, ['run', updateSnapScript], { cwd: `./${repoMap[context.trigger]}` })

  if (await gitHelper.isNeedCommit()) {
    await gitHelper.commit('chore: update snapshot')
  }

  await gitHelper.push(branchName)

  const targetRepo = new GithubHelper({
    repo: repoMap[context.trigger],
    owner: ownerMap[context.trigger],
    token: context.token,
    dryRun: context.dry_run,
  })
  targetRepo.createPR(title, branchName, body)
};
