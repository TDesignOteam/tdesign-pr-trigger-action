import type { AutoPrTrigger } from '../config/mapping'
import type { TriggerContext } from '../utils/trigger'
import { info } from '@actions/core'
import { exec } from '@actions/exec'
import { getOwner, getTargetRepo } from '../config/mapping'
import { adaptChangelogForRepo, addContributor, GitHelper, GithubHelper } from '../utils'

export default async function start(context: TriggerContext): Promise<void> {
  const targetRepoName = getTargetRepo(context.trigger as AutoPrTrigger)
  const owner = getOwner(context.trigger as AutoPrTrigger)

  if (!targetRepoName || !owner) {
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
  if (!prData.merged) {
    info('pr has been merged')
    githubHelper.addComment(context.pr_number, 'PR 还没合并，无法触发')
    return
  }
  const link = `([common#${context.pr_number}](https://github.com/Tencent/tdesign-common/pull/${context.pr_number}))`
  let body = addContributor(prData.body || '', prData.user.login, link)
  const trigger = context.trigger as AutoPrTrigger
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

  const branchName = `chore/submodule/common-pr-${context.pr_number}`
  await gitHelper.createBranch(branchName)
  const title = `chore(submodule): update common`
  if (!await gitHelper.isNeedCommit()) {
    info('nothing to commit')
    return
  }

  await gitHelper.commit(title)
  if (['tdesign-mobile-vue', 'tdesign-mobile-react'].includes(targetRepoName)) {
    await exec('npm', ['run', 'api:css', 'all'], { cwd: `./${targetRepoName}` })
    if (await gitHelper.isNeedCommit()) {
      await gitHelper.printDiff()
      await gitHelper.commit('docs: update css vars')
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
    githubHelper.addComment(context.pr_number, `> ${trigger}\r\n \r\n 创建 PR 成功， 请查看 ${newPrData.html_url}`)
  }
}
