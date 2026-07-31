import process from 'node:process'
import { getInput, info, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { GithubHelper } from './utils'
import useTrigger, { parseTrigger, parseTriggerArgs } from './utils/trigger'

export async function run(): Promise<void> {
  const repo = getInput('repo') || context.repo.repo
  const owner = getInput('owner') || context.repo.owner
  const prNumber = Number(getInput('pr_number')) || context.issue.number
  const token = getInput('token') || process.env.GITHUB_TOKEN || ''
  const trigger = getInput('trigger') || context.payload.comment?.body || ''
  const dryRun = getInput('dry-run', { trimWhitespace: true }) === 'true'

  info(`dryRun: ${dryRun}`)

  if (context.eventName === 'issue_comment') {
    info('pr comment trigger')
    if (!context.payload.issue?.pull_request) {
      info('issue_comment not a pull_request comment')
      return
    }
    const whitelistGithub = new GithubHelper({ owner: 'Tencent', repo: 'tdesign', token, dryRun })
    const whitelist = await whitelistGithub.getFileContent('.github/.pr-comment-ci-whitelist')
    const login = context.payload.comment?.user.login
    const isWhitelist = whitelist.split('\n').some(item => item.trim() === login)
    if (!isWhitelist) {
      info(`${login}不在白名单内，不触发`)
      return
    }
    info('comment whitelist trigger')
    const commentId = context.payload.comment?.id
    if (commentId) {
      const currentGithub = new GithubHelper({ owner, repo, token, dryRun })
      await currentGithub.addReaction(commentId)
    }
  }

  await useTrigger({
    owner,
    repo,
    pr_number: prNumber,
    token,
    trigger: parseTrigger(trigger),
    args: parseTriggerArgs(trigger),
    dry_run: dryRun,
  })
}
run().catch((err: unknown) => {
  setFailed(err instanceof Error ? err.message : String(err))
})
