import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { getInput, info } from '@actions/core'
import { context } from '@actions/github'
import useTrigger from './utils/trigger'

const WHITELIST_FILE = '.comment-trigger-whitelist'

function isUserInWhitelist(username: string): boolean {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const whitelist = readFileSync(resolve(__dirname, `../${WHITELIST_FILE}`), 'utf-8')
  const whitelistUsers = whitelist.split('\n').map(item => item.trim()).filter(Boolean)
  return whitelistUsers.includes(username)
}

function shouldTriggerFromComment(): boolean {
  if (context.eventName !== 'issue_comment') {
    return true
  }

  info('pr comment trigger')
  if (!context.payload.issue?.pull_request) {
    info('issue_comment not a pull_request comment')
    return false
  }

  const username = context.payload.comment?.user.login
  if (!username) {
    info('comment user login is missing')
    return false
  }

  if (!isUserInWhitelist(username)) {
    info(`${username}不在白名单内，不触发`)
    return false
  }

  info('comment whitelist trigger')
  return true
}

export async function run(): Promise<void> {
  const repo = getInput('repo') || context.repo.repo
  const owner = getInput('owner') || context.repo.owner
  const prNumber = Number(getInput('pr_number')) || context.issue.number
  const token = getInput('token') || process.env.GITHUB_TOKEN || ''
  const trigger = getInput('trigger') || context.payload.comment?.body || ''
  const dryRun = getInput('dry-run', { trimWhitespace: true }) === 'true'

  info(`dryRun: ${dryRun}`)

  if (!shouldTriggerFromComment()) {
    return
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
