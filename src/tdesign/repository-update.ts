import type { OperationContext } from '../operations'
import type { RepositoryTrigger, TriggerContext } from '../utils/trigger'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { endGroup, info, startGroup, warning } from '@actions/core'
import { exec } from '@actions/exec'
import { getRepositoryOperations } from '../config/repository-adapters'
import { GithubHelper } from '../utils/github-helper'

export async function runOperations(operations: NonNullable<ReturnType<typeof getRepositoryOperations>>, context: OperationContext): Promise<void> {
  for (const operation of operations) {
    startGroup(operation.name)
    try {
      await operation.run(context)
    }
    catch (error) {
      throw new Error(`Operation「${operation.name}」失败: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
    finally {
      endGroup()
    }
    if (context.skipRemaining) {
      break
    }
  }
}

async function addResultComment(github: GithubHelper, prNumber: number, body: string): Promise<void> {
  try {
    await github.addComment(prNumber, body)
  }
  catch (error) {
    warning(`添加运行结果评论失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function createOperationEnvironments(token: string, source: NodeJS.ProcessEnv = process.env): { env: Record<string, string>, gitEnv: Record<string, string> } {
  const gitEnv = { ...source, GH_TOKEN: token } as Record<string, string>
  const env = { ...source, HUSKY: '0' } as Record<string, string>
  delete env.INPUT_TOKEN
  delete env.GH_TOKEN
  delete env.GITHUB_TOKEN
  return { env, gitEnv }
}

export default async function updateRepository(context: TriggerContext): Promise<void> {
  const trigger = context.trigger as RepositoryTrigger
  const operations = getRepositoryOperations(context.repo, trigger)
  if (!operations) {
    info(`仓库 ${context.repo} 未适配指令 ${trigger}，跳过处理`)
    return
  }

  const parentDirectory = await mkdtemp(join(process.env.RUNNER_TEMP || tmpdir(), 'tdesign-pr-trigger-'))
  const cwd = join(parentDirectory, context.repo)
  const { env, gitEnv } = createOperationEnvironments(context.token)
  const github = new GithubHelper({
    owner: context.owner,
    repo: context.repo,
    token: context.token,
    dryRun: context.dry_run,
  })
  const prData = await github.getPrData(context.pr_number)
  const repository = `${context.owner}/${context.repo}`
  if (prData.head.repo?.full_name !== repository) {
    throw new Error(`暂不支持向 fork PR 推送: ${prData.head.repo?.full_name || 'unknown'}/${prData.head.ref}`)
  }

  await exec('gh', ['auth', 'setup-git'], { env: gitEnv })
  await exec('gh', ['repo', 'clone', repository, cwd], { env: gitEnv })
  await exec('gh', ['pr', 'checkout', String(context.pr_number), '--recurse-submodules'], { cwd, env: gitEnv })
  await exec('git', ['config', '--local', 'user.name', 'github-actions[bot]'], { cwd })
  await exec('git', ['config', '--local', 'user.email', 'github-actions[bot]@users.noreply.github.com'], { cwd })

  const operationContext: OperationContext = {
    cwd,
    dryRun: context.dry_run,
    env,
    gitEnv,
    github,
    headRef: prData.head.ref,
    owner: context.owner,
    prNumber: context.pr_number,
    repo: context.repo,
    skipRemaining: false,
    trigger,
  }
  const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  try {
    await runOperations(operations, operationContext)
    const result = operationContext.skipRemaining ? '无需处理' : '执行完成'
    await addResultComment(github, context.pr_number, `✅ ${trigger} ${result}。CI: [Open](${runUrl})`)
  }
  catch (error) {
    await addResultComment(github, context.pr_number, `❌ ${trigger} 执行失败：${error instanceof Error ? error.message : String(error)}。CI: [Open](${runUrl})`)
    throw error
  }
}
