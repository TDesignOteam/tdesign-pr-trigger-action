import type { TriggerContext } from '../utils/trigger'
import { info } from '@actions/core'
import { addContributor } from 'src/utils'
import { GitHelper } from '../utils/git-helper'
import { GithubHelper } from '../utils/github-helper'
import { ownerMap, repoMap } from '../utils/trigger'

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
  if (!prData.merged) {
    info('pr has been merged')
    githubHelper.addComment(context.pr_number, 'PR 还没合并，无法触发')
    return
  }
  const body = addContributor(prData.body || '', prData.user.login)
  const gitHelper = new GitHelper({
    repo: repoMap[context.trigger],
    owner: ownerMap[context.trigger],
    token: context.token,
    dryRun: context.dry_run,
  })

  await gitHelper.clone()
  await gitHelper.initSubmodule()
  await gitHelper.updateSubmodule()

  const branchName = `chore/update-common/pr/${context.pr_number}`
  await gitHelper.createBranch(branchName)
  const title = `chore(submodule): update common`
  if (!await gitHelper.isNeedCommit()) {
    info('nothing to commit')
    return true// nothing to commit
  }

  await gitHelper.commit(title)
  await gitHelper.push(branchName)

  const targetRepo = new GithubHelper({
    repo: repoMap[context.trigger],
    owner: ownerMap[context.trigger],
    token: context.token,
    dryRun: context.dry_run,
  })
  const newPrData = await targetRepo.createPR(title, branchName, body)
  if (newPrData) {
    githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n \r\n 创建 PR 成功， 请查看 ${newPrData.html_url}。`)
  }
}
