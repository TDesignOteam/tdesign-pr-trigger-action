import type { RepoHandlers, TriggerContext } from '../commands/types'
import type { RepoCommandConfig } from './operations/repo-config'
import { createPrCommandHandlers } from './operations/pr-handlers'
import { createCommonUpdatePr } from './operations/update-common'

export const repoConfig: RepoCommandConfig = {
  targetRepo: 'tdesign-miniprogram',
}

export const updateCommonAndCreatePr = (context: TriggerContext) => createCommonUpdatePr(context, repoConfig)

export const handlers: RepoHandlers = createPrCommandHandlers(repoConfig)
