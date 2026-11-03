import type { RepoHandlers } from '../../commands/types'
import type { RepoCommandConfig } from './repo-config'
import { updateCommonOnPr } from './update-common'
import { updateCoverageOnPr } from './update-coverage'
import { updateSnapshotOnPr } from './update-snapshot'

export function createPrCommandHandlers(config: RepoCommandConfig): RepoHandlers {
  return {
    '/update-common': context => updateCommonOnPr(context, config),
    '/update-snapshot': context => updateSnapshotOnPr(context, config),
    '/update-coverage': context => updateCoverageOnPr(context, config),
  }
}
