import type { ConflictRule, ConflictStrategy, TriggerOperation } from './types'
import { info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'

const GLOB_SPECIAL_CHARACTER_REGEXP = /[.+^${}()|[\]\\]/g
const GLOBSTAR_DIRECTORY_TOKEN = '__GLOBSTAR_DIRECTORY__'
const GLOBSTAR_TOKEN = '__GLOBSTAR__'

function matchesPattern(file: string, pattern: string): boolean {
  const expression = pattern
    .replace(GLOB_SPECIAL_CHARACTER_REGEXP, '\\$&')
    .replaceAll('**/', GLOBSTAR_DIRECTORY_TOKEN)
    .replaceAll('**', GLOBSTAR_TOKEN)
    .replaceAll('*', '[^/]*')
    .replaceAll('?', '[^/]')
    .replaceAll(GLOBSTAR_DIRECTORY_TOKEN, '(?:.*/)?')
    .replaceAll(GLOBSTAR_TOKEN, '.*')
  return new RegExp(`^${expression}$`).test(file)
}

export function resolveConflictStrategies(files: string[], rules: ConflictRule[]): Map<string, ConflictStrategy> {
  const resolved = new Map<string, ConflictStrategy>()
  for (const file of files) {
    const rule = rules.find(item => matchesPattern(file, item.pattern))
    if (rule) {
      resolved.set(file, rule.strategy)
    }
  }
  return resolved
}

async function hasChanges(cwd: string): Promise<boolean> {
  const { stdout } = await getExecOutput('git', ['status', '--porcelain'], { cwd })
  return stdout.trim().length > 0
}

export function commitChanges(message: string): TriggerOperation {
  return {
    name: `提交变更: ${message}`,
    async run({ cwd }) {
      if (!await hasChanges(cwd)) {
        info('没有需要提交的变更')
        return
      }
      await exec('git', ['add', '-A'], { cwd })
      await exec('git', ['commit', '-m', message, '--no-verify'], { cwd })
    },
  }
}

export interface MergeBranchOptions {
  commit?: boolean
  skipWhenNoConflicts?: boolean
}

export function mergeBranch(branch: string, conflictRules: ConflictRule[], options: MergeBranchOptions = {}): TriggerOperation {
  return {
    name: `合并 ${branch}`,
    async run(context) {
      const { cwd, gitEnv } = context
      await exec('git', ['fetch', 'origin', branch], { cwd, env: gitEnv })
      const exitCode = await exec('git', ['merge', `origin/${branch}`, '--no-commit'], {
        cwd,
        ignoreReturnCode: true,
      })
      const { stdout } = await getExecOutput('git', ['diff', '--name-only', '--diff-filter=U'], { cwd })
      const conflicts = stdout.split('\n').map(file => file.trim()).filter(Boolean)

      if (exitCode !== 0 && conflicts.length === 0) {
        throw new Error(`合并 origin/${branch} 失败`)
      }
      if (conflicts.length === 0 && options.skipWhenNoConflicts) {
        info('没有需要处理的合并冲突，结束流水线')
        context.skipRemaining = true
        return
      }

      const strategies = resolveConflictStrategies(conflicts, conflictRules)
      const unknownConflicts = conflicts.filter(file => !strategies.has(file))
      if (unknownConflicts.length > 0) {
        throw new Error(`存在未适配的合并冲突: ${unknownConflicts.join(', ')}`)
      }

      for (const [file, strategy] of strategies) {
        info(`使用 ${strategy} 解决冲突: ${file}`)
        await exec('git', ['checkout', `--${strategy}`, '--', file], { cwd })
        await exec('git', ['add', '--', file], { cwd })
      }

      const mergeHead = await exec('git', ['rev-parse', '--verify', '-q', 'MERGE_HEAD'], {
        cwd,
        ignoreReturnCode: true,
        silent: true,
      })
      if (mergeHead === 0 && options.commit !== false) {
        await exec('git', ['commit', '-m', `chore: merge ${branch}`, '--no-verify'], { cwd })
      }
    },
  }
}

export function pushChanges(): TriggerOperation {
  return {
    name: '推送 PR 分支',
    async run({ cwd, dryRun, gitEnv, headRef }) {
      if (dryRun) {
        info('dry-run 模式，不运行 git push')
        return
      }
      await exec('git', ['push', 'origin', `HEAD:${headRef}`], { cwd, env: gitEnv })
    },
  }
}
