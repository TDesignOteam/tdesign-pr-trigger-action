import { info } from 'node:console'
import process from 'node:process'
import { getInput } from '@actions/core'
import { context, getOctokit } from '@actions/github'

export async function run(): Promise<void> {
  const repo = getInput('repo') || context.repo.repo
  const owner = getInput('owner') || context.repo.owner
  const pr_number = getInput('pr_number') || context.issue.number
  const token = process.env.GITHUB_TOKEN || getInput('token')
  const octokit = getOctokit(token)
  const { data: pr_data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pr_number as number,
  })
  info('pr_data', pr_data)
  info('pr_data.data', pr_data.body)
}
run().catch(console.error)
