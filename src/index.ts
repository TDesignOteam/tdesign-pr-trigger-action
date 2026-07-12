import process from 'node:process'
import { getInput, info, setFailed, warning } from '@actions/core'
import { context } from '@actions/github'
import { getRepositoryOperations } from './config/repository-adapters'
import { GithubHelper } from './utils'
import useTrigger, { isRepositoryTrigger, parseTrigger, tryParseTrigger } from './utils/trigger'
import { isWhitelisted, loadWhitelist } from './utils/whitelist'

export async function run(): Promise<void> {
  const repo = getInput('repo') || context.repo.repo
  const owner = getInput('owner') || context.repo.owner
  const prNumber = Number(getInput('pr_number')) || context.issue.number
  const token = getInput('token') || process.env.GITHUB_TOKEN || ''
  const configuredTrigger = getInput('trigger')
  const triggerInput = configuredTrigger || context.payload.comment?.body || ''
  const dryRun = getInput('dry-run', { trimWhitespace: true }) === 'true'

  info(`dryRun: ${dryRun}`)

  const trigger = configuredTrigger ? parseTrigger(configuredTrigger) : tryParseTrigger(triggerInput)
  if (!trigger) {
    info('评论未包含受支持的触发器，跳过处理')
    return
  }

  if (context.eventName === 'issue_comment') {
    info('pr comment trigger')
    if (!context.payload.issue?.pull_request) {
      info('issue_comment not a pull_request comment')
      return
    }
    const user = context.payload.comment?.user.login || ''
    if (!isWhitelisted(loadWhitelist(), user)) {
      info(`${user} 不在评论指令白名单内，不触发`)
      return
    }
  }

  if (isRepositoryTrigger(trigger) && !getRepositoryOperations(repo, trigger)) {
    info(`仓库 ${repo} 未适配指令 ${trigger}，跳过处理`)
    return
  }
  if (context.eventName === 'issue_comment' && context.payload.comment?.id) {
    const githubHelper = new GithubHelper({ owner, repo, token, dryRun })
    try {
      await githubHelper.addReaction(context.payload.comment.id, 'rocket')
    }
    catch (error) {
      warning(`添加指令 reaction 失败，继续执行: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  await useTrigger({
    owner,
    repo,
    pr_number: prNumber,
    token,
    trigger,
    dry_run: dryRun,
  })
}
run().catch((error) => {
  setFailed(error instanceof Error ? error.message : String(error))
})
