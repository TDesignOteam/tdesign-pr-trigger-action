import { info } from '@actions/core'
import { addContributor, getPrData } from '../utils'
import useGit from '../utils/git'
import useGithub from '../utils/github'
import { ownerMap, repoMap, type TriggerContext } from '../utils/trigger'

export default async function start(context: TriggerContext) {
  const { createPR, addComment } = useGithub({ repo: repoMap[context.trigger], owner: ownerMap[context.trigger], token: context.token })
  const prData = await getPrData(context.owner, context.repo, context.pr_number, context.token)
  if (!prData.merged) {
    info('pr has been merged')
    addComment(context.pr_number, 'PR 还没合并，无法触发')
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

  await createPR(title, branchName, body)
}
