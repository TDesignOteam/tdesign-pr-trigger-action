import type { RepoHandlers, TriggerContext } from '../commands/types'
import type { RepoCommandConfig } from './operations/repo-config'
import { createPrCommandHandlers } from './operations/pr-handlers'
import { createCommonUpdatePr } from './operations/update-common'
import { createIconsUpdatePr } from './operations/update-icons'

export const repoConfig: RepoCommandConfig = {
  targetRepo: 'tdesign-mobile-vue',
  iconsPackage: 'tdesign-icons-vue-next',
  runApiCss: true,
}

export const updateCommonAndCreatePr = (context: TriggerContext) => createCommonUpdatePr(context, repoConfig)
export const updateIconsAndCreatePr = (context: TriggerContext) => createIconsUpdatePr(context, repoConfig)

export const handlers: RepoHandlers = createPrCommandHandlers(repoConfig)
