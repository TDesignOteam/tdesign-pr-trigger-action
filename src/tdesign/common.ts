import type { AutoPrTrigger } from '../config/mapping'
import type { TriggerContext } from '../utils/trigger'
import { info } from '@actions/core'
import { exec } from '@actions/exec'
import { BRANCH_PATTERNS, CSS_UPDATE_REPOS, PR_TITLES } from '../config/constants'
import { getOwner, getTargetRepo } from '../config/mapping'
import { adaptChangelogForRepo, addContributor, GitHelper, GithubHelper } from '../utils'
import { ActionError } from '../utils/error-handler'

export default async function start(context: TriggerContext): Promise<void> {
  const targetRepoName = getTargetRepo(context.trigger as AutoPrTrigger)
  const owner = getOwner(context.trigger as AutoPrTrigger)

  if (!targetRepoName || !owner) {
    throw new ActionError(`Invalid trigger: ${context.trigger}`, { trigger: context.trigger })
  }

  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const prData = await githubHelper.getPrData(context.pr_number)
  if (!prData.merged) {
    info('PR has not been merged yet')
    await githubHelper.addComment(context.pr_number, 'PR 还没合并，无法触发')
    return
  }

  const link = `([common#${context.pr_number}](https://github.com/Tencent/tdesign-common/pull/${context.pr_number}))`
  let body = addContributor(prData.body || '', prData.user.login, link)
  body = adaptChangelogForRepo(body, targetRepoName)

  const gitHelper = new GitHelper({
    repo: targetRepoName,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })

  const baseBranch = await gitHelper.clone()
  await gitHelper.initSubmodule()
  await gitHelper.updateSubmodule()

  const branchName = BRANCH_PATTERNS.SUBMODULE(context.pr_number)
  const title = PR_TITLES.SUBMODULE
  await gitHelper.createBranch(branchName)

  if (!await gitHelper.isNeedCommit()) {
    info('nothing to commit')
    return
  }

  await gitHelper.commit(title)

  if (CSS_UPDATE_REPOS.includes(targetRepoName as any)) {
    await exec('npm', ['run', 'api:css', 'all'], { cwd: `./${targetRepoName}` })
    if (await gitHelper.isNeedCommit()) {
      await gitHelper.printDiff()
      await gitHelper.commit(PR_TITLES.CSS_VARS)
    }
  }

  await gitHelper.push(branchName)

  const targetRepoHelper = new GithubHelper({
    repo: targetRepoName,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const newPrData = await targetRepoHelper.createPR(title, branchName, body, baseBranch)
  if (newPrData) {
    await githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n\r\n创建 PR 成功，请查看 ${newPrData.html_url}`)
  }
}
