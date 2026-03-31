import type { AutoPrTrigger } from '../config/mapping'
import type { TdesignRepo, TriggerContext } from '../utils/trigger'
import { endGroup, info, startGroup } from '@actions/core'
import { exec } from '@actions/exec'
import { getIconsPackage, getOwner, getPackageManager, getTargetRepo } from '../config/mapping'
import { adaptChangelogForRepo, addContributor, bumpIconsVersion, corepackEnable, getPkgLatestVersion, GitHelper, GithubHelper } from '../utils'

export const CND_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/

export async function getCdnIconfontVersion(): Promise<string> {
  const res = await fetch(`https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/src/iconfont/icon.tsx`)
  const text = await res.text()

  const match = text.match(CND_ICONFONT_VERSION_REG)
  return match?.[1] || ''
}

async function miniprogramUpdateIcons(repo: string, version: string): Promise<void> {
  await exec('node', ['./script/update-icons.mjs', '--version', version], { cwd: `./${repo}` })
  await exec('git', ['status'], { cwd: `./${repo}` })
}

async function getLatestVersion(packageName: string): Promise<string> {
  return packageName === 'cdn-iconfont' ? await getCdnIconfontVersion() : await getPkgLatestVersion(packageName)
}

async function updateSnapshot(gitHelper: any, packageManager: string, repo: string, packageName: string): Promise<void> {
  const updateSnapScript = packageName === 'cdn-iconfont' ? 'test:snap-update' : 'test:update'

  if (repo === 'tdesign-vue-next') {
    await exec(packageManager, ['-F', '@tdesign/vue-next-test', 'run', updateSnapScript], { cwd: `./${repo}` })
  }
  else {
    await exec(packageManager, ['run', updateSnapScript], { cwd: `./${repo}` })
  }

  if (await gitHelper.isNeedCommit()) {
    await gitHelper.commit('chore: update snapshot')
  }
}
export default async function start(context: TriggerContext): Promise<void> {
  const targetRepoName = getTargetRepo(context.trigger as AutoPrTrigger)
  const owner = getOwner(context.trigger as AutoPrTrigger)
  const packageName = getIconsPackage(context.trigger as AutoPrTrigger)

  if (!targetRepoName || !owner || !packageName) {
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
  let body = addContributor(prData.body || '', prData.user.login)
  body = adaptChangelogForRepo(body, targetRepoName)
  startGroup('body')
  info(`${body}`)
  endGroup()
  startGroup(packageName)
  const latestVersion = await getLatestVersion(packageName)

  info(`latestVersion: ${latestVersion}`)
  endGroup()

  const gitHelper = new GitHelper({
    repo: targetRepoName,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  await gitHelper.clone()
  await gitHelper.initSubmodule()
  const packageManager = getPackageManager(targetRepoName as TdesignRepo) || 'npm'
  if (packageManager === 'pnpm') {
    await corepackEnable()
  }
  await exec(packageManager, ['install'], { cwd: `./${targetRepoName}` })
  const branchName = `chore/icon/${packageName}/${latestVersion}`
  await gitHelper.createBranch(branchName)

  await bumpIconsVersion(packageManager, targetRepoName)
  if (packageName === 'cdn-iconfont') {
    await miniprogramUpdateIcons(targetRepoName, latestVersion)
  }

  if (!await gitHelper.isNeedCommit()) {
    return
  }

  const title = `feat(Icon): upgrade ${packageName} to ${latestVersion}`
  await gitHelper.commit(title)

  await updateSnapshot(gitHelper, packageManager, targetRepoName, packageName)

  await gitHelper.push(branchName)

  const targetRepoHelper = new GithubHelper({
    repo: targetRepoName,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  targetRepoHelper.createPR(title, branchName, body)
}
