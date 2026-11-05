import type { RepoHandlers, TriggerContext } from '../commands/types'
import type { RepoCommandConfig } from './operations/repo-config'
import { createPrCommandHandlers } from './operations/pr-handlers'
import { createCommonUpdatePr } from './operations/update-common'
import { updateCssvarsOnPr } from './operations/update-cssvars'
import { createIconsUpdatePr } from './operations/update-icons'
import { createSiteDepsUpdatePr } from './operations/update-site-deps'

export const repoConfig: RepoCommandConfig = {
  targetRepo: 'tdesign-miniprogram',
  iconsPackage: 'cdn-iconfont',
  iconsChangelogFile: 'packages/vue/CHANGELOG.md',
  iconsChangelogSections: ['tdesign-miniprogram', '@tdesign/uniapp'],
  siteDeps: ['@tdesign/site-components', '@tdesign/theme-generator'],
  snapshotScript: 'test:snap-update',
  coverageScript: ['cover', 'badge'],
  cssvarsScript: ['api:css', 'api:css:uni'],
}

export const updateCommonAndCreatePr = (context: TriggerContext) => createCommonUpdatePr(context, repoConfig)
export const updateIconsAndCreatePr = (context: TriggerContext) => createIconsUpdatePr(context, repoConfig)
export const updateSiteDepsAndCreatePr = (context: TriggerContext) => createSiteDepsUpdatePr(context, repoConfig)

export const handlers: RepoHandlers = {
  ...createPrCommandHandlers(repoConfig),
  '/update-cssvars': context => updateCssvarsOnPr(context, repoConfig),
}
