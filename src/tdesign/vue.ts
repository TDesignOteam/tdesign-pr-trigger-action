import type { TriggerContext } from '../utils/trigger'
import { error, info } from '@actions/core'
import { exec } from '@actions/exec'
import useGit from 'src/utils/git'

import useGithub from 'src/utils/github'

const supportTrigger = ['/update-common', '/update-snapshot']
export default async function run(context: TriggerContext) {
  if (!supportTrigger.includes(context.trigger)) {
    error(`${context.repo} 不支持 ${context.trigger} `)
  }
  const { getPrData } = useGithub({ repo: context.repo, owner: context.owner, token: context.token })
  const prData = await getPrData(context.pr_number)
  info(`getPrData:${JSON.stringify(prData, null, 2)}`)
  if (!prData.maintainer_can_modify) {
    error(`pr:${context.pr_number} 不允许维护者修改`)
  }
  if (prData.state !== 'open') {
    error(`pr:${context.pr_number} 不是 open 状态`)
  }

  let isForkPr = false
  if (prData.head.user.login !== context.owner) {
    isForkPr = true
    info(`pr:${context.pr_number} 是 fork pr`)
  }
  const branchName = prData.head.ref

  const { cloneRepo, initSubmodule, checkoutBranch, checkoutPr, addRemote } = useGit({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
  })
  await cloneRepo()

  if (isForkPr) {
    await checkoutPr(context.pr_number)
    await addRemote('pr', prData.base.repo.clone_url)
    await exec('git', ['fetch', 'pr'], { cwd: `../${context.repo}` })
  }
  else {
    await checkoutBranch(branchName)
  }
  await initSubmodule()
}
