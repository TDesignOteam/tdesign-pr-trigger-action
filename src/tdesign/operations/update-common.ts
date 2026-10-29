import type { TriggerContext } from '../../commands/types'
import type { RepoCommandConfig } from './repo-config'
import { info } from '@actions/core'
import { exec } from '@actions/exec'
import { targetRepoProfiles } from '../../commands/definitions'
import { adaptChangelogForRepo, addContributor, GitHelper, GithubHelper } from '../../utils'
import { checkoutPr } from './pr-workspace'

async function commitCommonUpdate(gitHelper: GitHelper, config: RepoCommandConfig) {
  await gitHelper.initSubmodule()
  await gitHelper.updateSubmodule()
  if (!await gitHelper.isNeedCommit()) {
    return false
  }
  await gitHelper.commit('chore(submodule): update common')
  if (config.runApiCss) {
    await exec('npm', ['run', 'api:css', 'all'], { cwd: `./${config.targetRepo}` })
    if (await gitHelper.isNeedCommit()) {
      await gitHelper.printDiff()
      await gitHelper.commit('docs: update css vars')
    }
  }
  return true
}

export async function createCommonUpdatePr(context: TriggerContext, config: RepoCommandConfig) {
  const targetRepo = config.targetRepo
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
  const { owner } = targetRepoProfiles[targetRepo]
  body = adaptChangelogForRepo(body, targetRepo)

  const gitHelper = new GitHelper({
    repo: targetRepo,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })

  const baseBranch = await gitHelper.clone()
  const branchName = `chore/submodule/common-pr-${context.pr_number}`
  await gitHelper.createBranch(branchName)
  const title = `chore(submodule): update common`
  if (!await commitCommonUpdate(gitHelper, config)) {
    info('nothing to commit')
    return true// nothing to commit
  }
  await gitHelper.push(branchName)

  const targetRepoHelper = new GithubHelper({
    repo: targetRepo,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const newPrData = await targetRepoHelper.createPR(title, branchName, body, baseBranch)
  if (newPrData) {
    githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n \r\n 创建 PR 成功， 请查看 ${newPrData.html_url}`)
  }
}

export async function updateCommonOnPr(context: TriggerContext, config: RepoCommandConfig) {
  const workspace = await checkoutPr(context, config)
  if (!workspace) {
    return
  }
  const commonPrNumber = Number(context.args) || 0
  const submodulePath = config.commonSubmodule || (await workspace.gitHelper.getSubmodulePaths())[0]
  if (commonPrNumber && submodulePath) {
    info(`common pr number: ${commonPrNumber}`)
    await workspace.gitHelper.checkoutSubmodulePr(submodulePath, commonPrNumber)
  }
  else {
    await workspace.gitHelper.updateSubmodule()
  }
  if (await workspace.gitHelper.isNeedCommit()) {
    await workspace.gitHelper.commitAll(commonPrNumber ? `chore: update common to PR ${commonPrNumber}` : 'chore: update common')
  }
  await workspace.gitHelper.mergeWithStrategy('origin/develop', { submodule: 'ours' })
  await workspace.gitHelper.pushToRepo(workspace.headRepo, workspace.headBranch, { ignoreError: true })
}
