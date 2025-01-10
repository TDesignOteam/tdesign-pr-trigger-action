import type { CreatePRContext } from '../utils'
import { endGroup, info, startGroup } from '@actions/core'
import { exec } from '@actions/exec'
import { addContributor, bumpIconsVersion, cloneRepo, createBranch, createPR, getPkgLatestVersion, getPrData, gitCommit, gitPush } from '../utils'
import { iconsMap, ownerMap, repoMap, type TriggerContext } from './trigger'

export const CND_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/

export async function getCdnIconfontVersion(): Promise<string> {
  const res = await fetch(`https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/src/iconfont/icon.tsx`)
  const text = await res.text()

  const match = text.match(CND_ICONFONT_VERSION_REG)
  return match?.[1] || ''
}
async function miniprogramUpdateIcons(repo: string, version: string) {
  await exec('npm', ['install'], { cwd: `../${repo}` })
  await exec('node', ['./script/update-icons.js', '--version ', version], { cwd: `../${repo}` })
  await exec('git', ['status'], { cwd: `../${repo}` })
}
export default async function start(context: TriggerContext) {
  const prData = await getPrData(context.owner, context.repo, context.pr_number, context.token)
  const body = addContributor(prData.body || '', prData.user.login)
  startGroup('body')
  info(`${body}`)
  endGroup()
  const packageName = iconsMap[context.comment]
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
  await cloneRepo(ownerMap[context.comment], repoMap[context.comment], context.token)
  const branchName = await createBranch(repoMap[context.comment], `chore/update-${packageName}/${latestVersion}`)

  await bumpIconsVersion(repoMap[context.comment])
  if (packageName === 'cdn-iconfont') {
    await miniprogramUpdateIcons(repoMap[context.comment], latestVersion)
  }
  await gitCommit(repoMap[context.comment], `chore: update ${packageName} to ${latestVersion}`)
  await gitPush(repoMap[context.comment], branchName)

  const title = `feat(Icon): ${packageName} update to ${latestVersion}`
  const prContext: CreatePRContext = {
    owner: ownerMap[context.comment],
    repo: repoMap[context.comment],
    title,
    head: branchName,
    body,
    token: context.token,
  }
  createPR(prContext)

  info(title)
};
