import type { TriggerContext } from '../utils/trigger'
import { addContributor, getPrData } from '../utils'
import useGit from '../utils/git'
import useGithub from '../utils/github'

export default async function start(context: TriggerContext) {
  const prData = await getPrData(context.owner, context.repo, context.pr_number, context.token)
  const body = addContributor(prData.body || '', prData.user.login)
  const { clone, initSubmodule, updateSubmodule, createBranch } = useGit({ repo: context.repo, owner: context.owner, token: context.token })

  await clone()
  await initSubmodule()
  await updateSubmodule()

  const branchName = `chore/update-common/pr/${context.pr_number}`

  await createBranch(branchName)

  const title = `chore(submodule): update common`
  const { createPR } = useGithub({ repo: context.repo, owner: context.owner, token: context.token })

  await createPR(title, branchName, body)
}
