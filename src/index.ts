import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { getInput, info } from '@actions/core'
import { context } from '@actions/github'
import { setGitConfig } from './utils'
import useTrigger from './utils/trigger'

export async function run(): Promise<void> {
  const repo = getInput('repo') || context.repo.repo
  const owner = getInput('owner') || context.repo.owner
  const pr_number = getInput('pr_number') || context.issue.number
  const token = getInput('token') || process.env.GITHUB_TOKEN || ''
  const trigger = getInput('trigger') || context.payload.comment?.body || ''

  if (context.eventName === 'issue_comment') {
    info('pr comment trigger')
    if (context.payload.issue?.pull_request) {
      info('issue_comment not a pull_request comment')
      return
    }

    const whitelist = readFileSync(resolve(__dirname, '../.comment-trigger-whitelist'), 'utf-8')
    // TODO 需要白名单的人才能触发
    let isWhitelist = false

    whitelist.split('\n').forEach((item) => {
      if (item.trim() === context.payload.comment?.user.login) {
        info('comment whitelist trigger')
        isWhitelist = true
      }
    })
    if (!isWhitelist) {
      info(`${context.payload.comment?.user.login}不在白名单内，不触发`)
      return
    }
  }

  await setGitConfig()

  useTrigger({
    owner,
    repo,
    pr_number: pr_number as number,
    token,
    trigger: trigger.trim(),
  })
}
run().catch(console.error)
