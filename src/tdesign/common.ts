import type { TriggerContext } from '../utils/trigger'
import { getInput, info } from '@actions/core'
import { GitHelper } from '../utils/git-helper'
import useGithub from '../utils/github'
import { ownerMap, repoMap } from '../utils/trigger'

export default async function start(context: TriggerContext) {
  if (!Reflect.has(repoMap, context.trigger)) {
    info(`错误的trigger: ${context.trigger}`)
    return
  }
  const dryRun = getInput('dry-run')
  info(`dryRun: ${dryRun}`)
  const { getPrData: getCommonPrData, addComment: commentAddComment } = useGithub({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
  })
  const prData = await getCommonPrData(context.pr_number)
  if (!prData.merged) {
    info('pr has been merged')
    commentAddComment(context.pr_number, 'PR 还没合并，无法触发')
    return
  }
  // const body = addContributor(prData.body || '', prData.user.login)
  const gitHelper = new GitHelper({
    repo: repoMap[context.trigger],
    owner: ownerMap[context.trigger],
    token: context.token,
  })

  await gitHelper.clone()
  await gitHelper.initSubmodule()
  await gitHelper.updateSubmodule()

  const branchName = `chore/update-common/pr/${context.pr_number}`
  await gitHelper.createBranch(branchName)
  const title = `chore(submodule): update _common`
  if (!await gitHelper.isNeedCommit()) {
    info('nothing to commit')
    return true// nothing to commit
  }

  await gitHelper.commit(title)
  if (!dryRun) {
    // await gitHelper.push(branchName)
  }
  else {
    info('dry run, not push')
  }

  // const { createPR } = useGithub({ repo: repoMap[context.trigger], owner: ownerMap[context.trigger], token: context.token })
  if (!dryRun) {
    // const newPrData = await createPR(title, branchName, body)
    // commentAddComment(context.pr_number, `> ${context.trigger}\r\n \r\n 已创建 PR: ${newPrData.html_url}`)
  }
  else {
    info('dry run, not create pr,not add comment')
  }
}
