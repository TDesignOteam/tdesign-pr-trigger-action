import type { TriggerContext } from '../../commands/types'
import type { RepoCommandConfig } from './repo-config'
import { runPrScript } from './pr-workspace'

export async function updateCssvarsOnPr(context: TriggerContext, config: RepoCommandConfig) {
  await runPrScript(context, { ...config, recursiveScripts: false }, {
    progressComment: '正在运行 CSS 变量文档更新',
    script: config.cssvarsScript ?? 'api:css',
    scriptArgs: ['all'],
    commitMessage: 'docs: update css vars',
  })
}
