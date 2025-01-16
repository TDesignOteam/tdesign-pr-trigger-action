import { endGroup, info, startGroup } from '@actions/core'
import { exec } from '@actions/exec'
import useGit from 'src/utils/git'
import useGithub from 'src/utils/github'
import { addContributor, bumpIconsVersion, getPkgLatestVersion, getPrData } from '../utils'
import { iconsMap, ownerMap, repoMap, type TriggerContext } from '../utils/trigger'

export const CND_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/

export async function getCdnIconfontVersion(): Promise<string> {
  const res = await fetch(`https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/src/iconfont/icon.tsx`)
  const text = await res.text()

  const match = text.match(CND_ICONFONT_VERSION_REG)
  return match?.[1] || ''
}
async function miniprogramUpdateIcons(repo: string, version: string) {
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
  const { cloneRepo, createBranch, isNeedCommit, gitCommit, gitPush } = useGit({
    repo: repoMap[context.trigger],
    owner: ownerMap[context.trigger],
    token: context.token,
  })
  await cloneRepo()
  await exec('npm', ['install'], { cwd: `../${repoMap[context.trigger]}` })
  const branchName = `chore/icon/${packageName}/${latestVersion}`
  await createBranch(branchName)

  await bumpIconsVersion(repoMap[context.trigger])
  if (packageName === 'cdn-iconfont') {
    await miniprogramUpdateIcons(repoMap[context.trigger], latestVersion)
  }
  if (!await isNeedCommit()) {
    return true
  }
  const title = `feat(Icon): upgrade ${packageName} to ${latestVersion}`
  await gitCommit(title)

  await exec('npm', ['run', 'test:update'], { cwd: `../${repoMap[context.trigger]}` })
  if (await isNeedCommit()) {
    await gitCommit('chore: update snapshot')
  }
  await gitPush(branchName)

  const { createPR } = useGithub({
    repo: repoMap[context.trigger],
    owner: ownerMap[context.trigger],
    token: context.token,
  })

  await createPR(title, branchName, body)
};
