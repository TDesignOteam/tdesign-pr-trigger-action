import type { TriggerContext } from '../../commands/types'
import type { RepoCommandConfig } from './repo-config'
import { info } from '@actions/core'
import { targetRepoProfiles } from '../../commands/definitions'
import { bumpSiteDeps, corepackEnable, GitHelper, GithubHelper } from '../../utils'

export async function createSiteDepsUpdatePr(context: TriggerContext, config: RepoCommandConfig) {
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
  const targetRepo = config.targetRepo
  const { owner, packageManager } = targetRepoProfiles[targetRepo]
  const siteDeps = config.siteDeps
  if (!siteDeps || siteDeps.length === 0) {
    throw new Error(`${targetRepo} 未配置 siteDeps`)
  }

  const gitHelper = new GitHelper({
    repo: targetRepo,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const baseBranch = await gitHelper.clone()
  if (packageManager === 'pnpm') {
    await corepackEnable()
  }
  const branchName = `chore/site-deps/pr-${context.pr_number}`
  await gitHelper.createBranch(branchName)

  await bumpSiteDeps(packageManager, targetRepo, siteDeps)
  const title = 'chore: upgrade tdesign site deps'
  if (!await gitHelper.isNeedCommit()) {
    githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n \r\n site 依赖已是最新，无需更新`)
    return true
  }
  await gitHelper.commit(title)
  await gitHelper.push(branchName)

  const targetRepoHelper = new GithubHelper({
    repo: targetRepo,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const body = `${title} ([${context.repo}#${context.pr_number}](https://github.com/${context.owner}/${context.repo}/pull/${context.pr_number}))`
  const newPrData = await targetRepoHelper.createPR(title, branchName, body, baseBranch)
  if (newPrData) {
    githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n \r\n 创建 PR 成功， 请查看 ${newPrData.html_url}`)
  }
}
