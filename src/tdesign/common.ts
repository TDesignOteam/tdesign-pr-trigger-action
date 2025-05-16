import type { TriggerContext } from '../utils/trigger'
import { info } from '@actions/core'
import { addContributor } from '../utils'
import useGit from '../utils/git'
import useGithub from '../utils/github'
import { ownerMap, repoMap } from '../utils/trigger'

export default async function start(context: TriggerContext) {
  if (!Reflect.has(repoMap, context.trigger)) {
    info(`错误的trigger: ${context.trigger}`)
    return
  }
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
  const body = addContributor(prData.body || '', prData.user.login)
  const { cloneRepo, initSubmodule, updateSubmodule, createBranch, isNeedCommit, gitCommit, gitPush } = useGit({
    repo: repoMap[context.trigger],
    owner: ownerMap[context.trigger],
    token: context.token,
  })

  await cloneRepo()
  await initSubmodule()
  await updateSubmodule()

  const branchName = `chore/update-common/pr/${context.pr_number}`
  await createBranch(branchName)
  const title = `chore(submodule): update _common`
  if (!await isNeedCommit()) {
    info('nothing to commit')
    return true// nothing to commit
  }

  await gitCommit(title)
  await gitPush(branchName)

  const { createPR } = useGithub({ repo: repoMap[context.trigger], owner: ownerMap[context.trigger], token: context.token })
  const newPrData = await createPR(title, branchName, body)
  commentAddComment(context.pr_number, `> ${context.trigger}\r\n \r\n 已创建 PR: ${newPrData.html_url}`)
}
