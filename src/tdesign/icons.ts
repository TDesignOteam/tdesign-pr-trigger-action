import type { AutoPrTrigger } from '../config/mapping'
import type { TriggerContext } from '../utils/trigger'
import { endGroup, info, startGroup } from '@actions/core'
import { exec } from '@actions/exec'
import { BRANCH_PATTERNS, PR_TITLES, SNAPSHOT_SCRIPTS } from '../config/constants'
import { getIconsPackage, getOwner, getPackageManager, getTargetRepo } from '../config/mapping'
import { adaptChangelogForRepo, addContributor, bumpIconsVersion, corepackEnable, getPkgLatestVersion, GitHelper, GithubHelper } from '../utils'
import { ActionError } from '../utils/error-handler'

const CDN_ICONFONT_VERSION_REG = /https:\/\/tdesign\.gtimg\.com\/icon\/(\d+\.\d+\.\d+)\/fonts\/index\.css/
const CDN_ICONFONT_SOURCE = 'https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/src/iconfont/icon.tsx'

export async function getCdnIconfontVersion(): Promise<string> {
  const res = await fetch(CDN_ICONFONT_SOURCE)
  const text = await res.text()
  const match = text.match(CDN_ICONFONT_VERSION_REG)
  return match?.[1] || ''
}

async function getLatestVersion(packageName: string): Promise<string> {
  return packageName === 'cdn-iconfont' ? await getCdnIconfontVersion() : await getPkgLatestVersion(packageName)
}

async function runMiniprogramIconUpdate(repo: string, version: string): Promise<void> {
  await exec('node', ['./script/update-icons.mjs', '--version', version], { cwd: `./${repo}` })
  await exec('git', ['status'], { cwd: `./${repo}` })
}

function getSnapshotScriptName(packageName: string): string {
  return packageName === 'cdn-iconfont' ? SNAPSHOT_SCRIPTS.MINIPROGRAM : SNAPSHOT_SCRIPTS.DEFAULT
}

async function runSnapshotUpdate(gitHelper: GitHelper, packageManager: string, repo: string, packageName: string): Promise<void> {
  const scriptName = getSnapshotScriptName(packageName)

  if (repo === 'tdesign-vue-next') {
    await exec(packageManager, ['-F', '@tdesign/vue-next-test', 'run', scriptName], { cwd: `./${repo}` })
  }
  else {
    await exec(packageManager, ['run', scriptName], { cwd: `./${repo}` })
  }

  if (await gitHelper.isNeedCommit()) {
    await gitHelper.commit(PR_TITLES.SNAPSHOT)
  }
}

async function installDependencies(gitHelper: GitHelper, repo: string, packageManager: string): Promise<void> {
  if (packageManager === 'pnpm') {
    await corepackEnable()
  }
  await exec(packageManager, ['install'], { cwd: `./${repo}` })
}

async function prepareRepository(gitHelper: GitHelper): Promise<void> {
  await gitHelper.clone()
  await gitHelper.initSubmodule()
}

async function updateIconsDependencies(packageManager: string, repo: string, packageName: string): Promise<void> {
  await bumpIconsVersion(packageManager, repo)

  if (packageName === 'cdn-iconfont') {
    const latestVersion = await getLatestVersion(packageName)
    await runMiniprogramIconUpdate(repo, latestVersion)
  }
}

export default async function start(context: TriggerContext): Promise<void> {
  const targetRepoName = getTargetRepo(context.trigger as AutoPrTrigger)
  const owner = getOwner(context.trigger as AutoPrTrigger)
  const packageName = getIconsPackage(context.trigger as AutoPrTrigger)

  if (!targetRepoName || !owner || !packageName) {
    throw new ActionError(`Invalid trigger: ${context.trigger}`, { trigger: context.trigger })
  }

  const sourceGithubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const prData = await sourceGithubHelper.getPrData(context.pr_number)
  let body = addContributor(prData.body || '', prData.user.login)
  body = adaptChangelogForRepo(body, targetRepoName)

  const latestVersion = await getLatestVersion(packageName)

  startGroup('PR Body')
  info(body)
  endGroup()

  startGroup(`${packageName} Version`)
  info(`Latest version: ${latestVersion}`)
  endGroup()

  const gitHelper = new GitHelper({
    repo: targetRepoName,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  await prepareRepository(gitHelper)

  const packageManager = getPackageManager(targetRepoName) || 'npm'
  await installDependencies(gitHelper, targetRepoName, packageManager)

  const branchName = BRANCH_PATTERNS.ICON(packageName, latestVersion)
  await gitHelper.createBranch(branchName)

  await updateIconsDependencies(packageManager, targetRepoName, packageName)

  if (!await gitHelper.isNeedCommit()) {
    return
  }

  const title = PR_TITLES.ICON(packageName, latestVersion)
  await gitHelper.commit(title)

  await runSnapshotUpdate(gitHelper, packageManager, targetRepoName, packageName)

  await gitHelper.push(branchName)

  const targetRepoHelper = new GithubHelper({
    repo: targetRepoName,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  await targetRepoHelper.createPR(title, branchName, body)
}
