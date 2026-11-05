import type { TriggerContext } from '../../commands/types'
import type { MergeConflictStrategy } from '../../utils/git-helper'
import type { RepoCommandConfig } from './repo-config'
import process from 'node:process'
import { info } from '@actions/core'
import { exec } from '@actions/exec'
import { targetRepoProfiles } from '../../commands/definitions'
import { corepackEnable, GitHelper, GithubHelper } from '../../utils'

export interface PrWorkspace {
  githubHelper: GithubHelper
  gitHelper: GitHelper
  headRepo: string
  headBranch: string
}

export async function checkoutPr(context: TriggerContext): Promise<PrWorkspace | undefined> {
  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const prData = await githubHelper.getPrData(context.pr_number)
  if (prData.merged) {
    info('pr has been merged')
    return
  }
  if (context.comment_id) {
    await githubHelper.addReaction(context.comment_id, 'rocket')
  }
  const headRepo = prData.head.repo.full_name
  const headBranch = prData.head.ref
  info(`pr head: ${headRepo}:${headBranch}`)

  const gitHelper = new GitHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  await gitHelper.clone()
  await gitHelper.fetchPullRequestHead(context.pr_number, `pr-${context.pr_number}`)
  await gitHelper.initSubmodule()
  return {
    githubHelper,
    gitHelper,
    headRepo,
    headBranch,
  }
}

function getRunLink() {
  return `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
}

export interface RunPrScriptOptions {
  progressComment: string
  script: string | string[]
  scriptArgs?: string[]
  commitMessage: string
  merge?: MergeConflictStrategy
}

export async function runPrScript(context: TriggerContext, config: RepoCommandConfig, options: RunPrScriptOptions) {
  const workspace = await checkoutPr(context)
  if (!workspace) {
    return
  }
  await workspace.githubHelper.addComment(context.pr_number, `⏳ ${options.progressComment}。。。 CI: ${getRunLink()}`)

  if (options.merge) {
    await workspace.gitHelper.mergeWithStrategy('origin/develop', options.merge)
  }

  const targetRepo = config.targetRepo
  const packageManager = targetRepoProfiles[targetRepo].packageManager
  const scripts = Array.isArray(options.script)
    ? options.script
    : [options.script]
  if (packageManager === 'pnpm') {
    await corepackEnable()
    await exec(packageManager, ['install'], { cwd: `./${targetRepo}` })
    for (const script of scripts) {
      const args = config.recursiveScripts === false
        ? ['run', script]
        : ['--recursive', 'run', script]
      await exec(packageManager, [
        ...args,
        ...options.scriptArgs ?? [],
      ], { cwd: `./${targetRepo}` })
    }
  }
  else {
    await exec(packageManager, ['install'], { cwd: `./${targetRepo}` })
    for (const script of scripts) {
      await exec(packageManager, [
        'run',
        script,
        ...options.scriptArgs ?? [],
      ], { cwd: `./${targetRepo}` })
    }
  }

  if (await workspace.gitHelper.isNeedCommit()) {
    await workspace.gitHelper.commitAll(options.commitMessage)
  }
  await workspace.gitHelper.pushToRepo(workspace.headRepo, workspace.headBranch)
}
