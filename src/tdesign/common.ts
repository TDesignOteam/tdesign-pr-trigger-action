import type { TriggerContext } from '../utils/trigger'
import type { TargetConfig } from './types'
import { info } from '@actions/core'
import { exec } from '@actions/exec'
import { adaptChangelogForRepo, addContributor, GitHelper, GithubHelper } from '../utils'

export default async function updateCommon(context: TriggerContext, target: TargetConfig): Promise<void | boolean> {
  const sourceGithub = new GithubHelper({ repo: context.repo, owner: context.owner, token: context.token, dryRun: context.dry_run })
  const prData = await sourceGithub.getPrData(context.pr_number)
  if (!prData.merged) {
    info('pr has been merged')
    await sourceGithub.addComment(context.pr_number, 'PR 还没合并，无法触发')
    return
  }

  const link = `([common#${context.pr_number}](https://github.com/Tencent/tdesign-common/pull/${context.pr_number}))`
  const body = adaptChangelogForRepo(addContributor(prData.body || '', prData.user.login, link), target.repo)
  const gitHelper = new GitHelper({ repo: target.repo, owner: target.owner, token: context.token, dryRun: context.dry_run })
  const baseBranch = await gitHelper.clone()
  await gitHelper.initSubmodule()
  await gitHelper.updateSubmodule()

  const branchName = `chore/submodule/common-pr-${context.pr_number}`
  await gitHelper.createBranch(branchName)
  const title = 'chore(submodule): update common'
  if (!await gitHelper.isNeedCommit()) {
    info('nothing to commit')
    return true
  }
  await gitHelper.commit(title)
  if (['tdesign-mobile-vue', 'tdesign-mobile-react'].includes(target.repo)) {
    await exec('npm', ['run', 'api:css', 'all'], { cwd: `./${target.repo}` })
    if (await gitHelper.isNeedCommit()) {
      await gitHelper.printDiff()
      await gitHelper.commit('docs: update css vars')
    }
  }
  await gitHelper.push(branchName)

  const targetGithub = new GithubHelper({ repo: target.repo, owner: target.owner, token: context.token, dryRun: context.dry_run })
  const newPrData = await targetGithub.createPR(title, branchName, body, baseBranch)
  if (newPrData) {
    await sourceGithub.addComment(context.pr_number, `> ${context.trigger}\r\n \r\n 创建 PR 成功， 请查看 ${newPrData.html_url}`)
  }
}
