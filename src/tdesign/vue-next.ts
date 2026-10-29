import type { RepoHandlers, TriggerContext } from '../commands/types'
import type { RepoCommandConfig } from './operations/repo-config'
import { createPrCommandHandlers } from './operations/pr-handlers'
import { createCommonUpdatePr } from './operations/update-common'

export const repoConfig: RepoCommandConfig = {
  targetRepo: 'tdesign-vue-next',
  commonSubmodule: 'packages/common',
  snapshotConflictFiles: [
    'packages/tdesign-vue-next/test/src/snap/__snapshots__/csr.test.ts.snap',
    'packages/tdesign-vue-next/test/src/snap/__snapshots__/ssr.test.ts.snap',
  ],
}

export const updateCommonAndCreatePr = (context: TriggerContext) => createCommonUpdatePr(context, repoConfig)

export const handlers: RepoHandlers = createPrCommandHandlers(repoConfig)
