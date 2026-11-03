import type { TriggerContext } from '../../commands/types'
import type { RepoCommandConfig } from './repo-config'
import { runPrScript } from './pr-workspace'

export async function updateSnapshotOnPr(context: TriggerContext, config: RepoCommandConfig) {
  await runPrScript(context, config, {
    progressComment: '正在运行快照更新',
    script: config.snapshotScript ?? 'test:update',
    commitMessage: 'chore: update snapshot',
    merge: { submodule: 'theirs', snapshot: 'theirs', snapshotFiles: config.snapshotConflictFiles },
  })
}
