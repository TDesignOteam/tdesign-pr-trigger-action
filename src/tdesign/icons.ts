import type { CreatePRContext } from '../utils'
import { endGroup, info, startGroup } from '@actions/core'
import { exec } from '@actions/exec'
import { addContributor, bumpIconsVersion, cloneRepo, createBranch, createPR, getPkgLatestVersion, getPrData, gitCommit, gitPush } from '../utils'
import { iconsMap, ownerMap, repoMap, type TriggerContext } from '../utils/trigger'

export const CND_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/

export async function getCdnIconfontVersion(): Promise<string> {
  const res = await fetch(`https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/src/iconfont/icon.tsx`)
  const text = await res.text()

  const match = text.match(CND_ICONFONT_VERSION_REG)
  return match?.[1] || ''
}
async function miniprogramUpdateIcons(repo: string, version: string) {
  await exec('npm', ['install'], { cwd: `../${repo}` })
  await exec('node', ['./script/update-icons.js', '--version', version], { cwd: `../${repo}` })
  await exec('git', ['status'], { cwd: `../${repo}` })
}
export default async function start(context: TriggerContext) {
  const prData = await getPrData(context.owner, context.repo, context.pr_number, context.token)
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
  await cloneRepo(ownerMap[context.trigger], repoMap[context.trigger], context.token)
  const branchName = `chore/update-${packageName}/${latestVersion}`
  await createBranch(repoMap[context.trigger], branchName)

  await bumpIconsVersion(repoMap[context.trigger])
  if (packageName === 'cdn-iconfont') {
    await miniprogramUpdateIcons(repoMap[context.trigger], latestVersion)
  }
  await gitCommit(repoMap[context.trigger], `chore: update ${packageName} to ${latestVersion}`)
  await gitPush(repoMap[context.trigger], branchName)

  const title = `feat(Icon): ${packageName} update to ${latestVersion}`
  const prContext: CreatePRContext = {
    owner: ownerMap[context.trigger],
    repo: repoMap[context.trigger],
    title,
    head: branchName,
    body,
    token: context.token,
  }
  createPR(prContext)

  info(title)
};
