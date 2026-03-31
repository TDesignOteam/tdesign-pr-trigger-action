import type { AutoPrTrigger } from '../config/mapping'
import type { TriggerContext } from '../utils/trigger'
import { info } from '@actions/core'
import { exec } from '@actions/exec'
import { BRANCH_PATTERNS, CSS_UPDATE_REPOS, PR_TITLES } from '../config/constants'
import { getOwner, getTargetRepo } from '../config/mapping'
import { adaptChangelogForRepo, addContributor, GitHelper, GithubHelper } from '../utils'
import { ActionError } from '../utils/error-handler'

const COMMON_REPO = 'tdesign-common'
const COMMON_OWNER = 'Tencent'
const PR_NOT_MERGED_MESSAGE = 'PR 还没合并，无法触发'

function generateCommonPrLink(prNumber: number): string {
  return `([common#${prNumber}](https://github.com/${COMMON_OWNER}/${COMMON_REPO}/pull/${prNumber}))`
}

function preparePrBody(originalBody: string, userLogin: string, prNumber: number, targetRepo: string): string {
  const link = generateCommonPrLink(prNumber)
  const body = addContributor(originalBody, userLogin, link)
  return adaptChangelogForRepo(body, targetRepo as any)
}

async function prepareRepository(gitHelper: GitHelper): Promise<string> {
  const baseBranch = await gitHelper.clone()
  await gitHelper.initSubmodule()
  await gitHelper.updateSubmodule()
  return baseBranch
}

async function updateCssVariables(gitHelper: GitHelper, repo: string): Promise<void> {
  await exec('npm', ['run', 'api:css', 'all'], { cwd: `./${repo}` })
  if (await gitHelper.isNeedCommit()) {
    await gitHelper.printDiff()
    await gitHelper.commit(PR_TITLES.CSS_VARS)
  }
}

async function createPrAndComment(
  targetRepoHelper: GithubHelper,
  sourceGithubHelper: GithubHelper,
  title: string,
  branchName: string,
  body: string,
  baseBranch: string,
  trigger: string,
  sourcePrNumber: number,
): Promise<void> {
  const prData = await targetRepoHelper.createPR(title, branchName, body, baseBranch)
  if (prData) {
    const comment = `> ${trigger}\r\n\r\n创建 PR 成功，请查看 ${prData.html_url}`
    await sourceGithubHelper.addComment(sourcePrNumber, comment)
  }
}

async function checkAndCommentUnmergedPr(
  githubHelper: GithubHelper,
  prNumber: number,
): Promise<boolean> {
  const prData = await githubHelper.getPrData(prNumber)
  if (!prData.merged) {
    info('PR has not been merged yet')
    await githubHelper.addComment(prNumber, PR_NOT_MERGED_MESSAGE)
    return false
  }
  return true
}

function isCssUpdateRequired(repo: string): boolean {
  return CSS_UPDATE_REPOS.includes(repo as any)
}

export default async function start(context: TriggerContext): Promise<void> {
  const targetRepoName = getTargetRepo(context.trigger as AutoPrTrigger)
  const owner = getOwner(context.trigger as AutoPrTrigger)

  if (!targetRepoName || !owner) {
    throw new ActionError(`Invalid trigger: ${context.trigger}`, { trigger: context.trigger })
  }

  const sourceGithubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })

  if (!(await checkAndCommentUnmergedPr(sourceGithubHelper, context.pr_number))) {
    return
  }

  const prData = await sourceGithubHelper.getPrData(context.pr_number)
  const body = preparePrBody(prData.body || '', prData.user.login, context.pr_number, targetRepoName)

  const gitHelper = new GitHelper({
    repo: targetRepoName,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })

  const baseBranch = await prepareRepository(gitHelper)

  const branchName = BRANCH_PATTERNS.SUBMODULE(context.pr_number)
  const title = PR_TITLES.SUBMODULE
  await gitHelper.createBranch(branchName)

  if (!await gitHelper.isNeedCommit()) {
    info('Nothing to commit')
    return
  }

  await gitHelper.commit(title)

  if (isCssUpdateRequired(targetRepoName)) {
    await updateCssVariables(gitHelper, targetRepoName)
  }

  await gitHelper.push(branchName)

  const targetRepoHelper = new GithubHelper({
    repo: targetRepoName,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })

  await createPrAndComment(
    targetRepoHelper,
    sourceGithubHelper,
    title,
    branchName,
    body,
    baseBranch,
    context.trigger,
    context.pr_number,
  )
}
