import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import * as github from '@actions/github'
import useTrigger from './utils/trigger'

export async function run(): Promise<void> {
  const repo = core.getInput('repo') || github.context.repo.repo
  const owner = core.getInput('owner') || github.context.repo.owner
  const prNumber = Number(core.getInput('pr_number')) || github.context.issue.number
  const token = core.getInput('token') || process.env.GITHUB_TOKEN || ''
  const trigger = core.getInput('trigger') || github.context.payload.comment?.body || ''
  const dryRun = Boolean(core.getInput('dry-run'))

  core.info(`dryRun: ${dryRun}`)

  if (github.context.eventName === 'issue_comment') {
    core.info('pr comment trigger')
    if (!github.context.payload.issue?.pull_request) {
      core.info('issue_comment not a pull_request comment')
      return
    }

    const whitelist = readFileSync(resolve(__dirname, '../.comment-trigger-whitelist'), 'utf-8')
    // TODO 需要白名单的人才能触发
    let isWhitelist = false

    whitelist.split('\n').forEach((item) => {
      if (item.trim() === github.context.payload.comment?.user.login) {
        core.info('comment whitelist trigger')
        isWhitelist = true
      }
    })
    if (!isWhitelist) {
      core.info(`${github.context.payload.comment?.user.login}不在白名单内，不触发`)
      return
    }
  }

  useTrigger({
    owner,
    repo,
    pr_number: prNumber,
    token,
    trigger: trigger.trim(),
    dry_run: dryRun,
  })
}
run().catch(console.error)
