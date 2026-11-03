import type { TriggerContext } from '../../commands/types'
import type { RepoCommandConfig } from './repo-config'
import { runPrScript } from './pr-workspace'

export async function updateCoverageOnPr(context: TriggerContext, config: RepoCommandConfig) {
  await runPrScript(context, config, {
    progressComment: '正在运行 coverage badge 更新',
    script: config.coverageScript ?? 'generate:coverage-badge',
    commitMessage: 'chore: update coverage badge',
  })
}
