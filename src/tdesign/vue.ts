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
    await addRemote(prData.head.user.login, prData.head?.repo?.clone_url || '')
    await checkoutPr(context.pr_number)
    await exec('git', [
      'branch',
      '--set-upstream-to',
      `refs/remotes/${prData.head.user.login}/${prData.head.ref}`,
      `pr-${context.pr_number}`,
    ], { cwd: `../${context.repo}` })
  }
  else {
    await checkoutBranch(branchName)
  }
  await initSubmodule()
  await exec('npm', ['install'], { cwd: `../${context.repo}` })
  await exec('npm', ['run', 'test:update'], { cwd: `../${context.repo}` })
  await exec('git', ['status'], { cwd: `../${context.repo}` })
}
