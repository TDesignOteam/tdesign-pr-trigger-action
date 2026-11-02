import type { RepoHandlers, TriggerContext } from '../commands/types'
import type { RepoCommandConfig } from './operations/repo-config'
import * as miniprogramRepo from './miniprogram'
import * as mobileReactRepo from './mobile-react'
import * as mobileVueRepo from './mobile-vue'
import { createIconsPkgUpdatePr } from './operations/update-icons-pkg'
import * as reactRepo from './react'
import * as vueRepo from './vue'
import * as vueNextRepo from './vue-next'

export const repoConfig: RepoCommandConfig = {
  targetRepo: 'tdesign',
  iconsPackage: 'tdesign-icons-view',
  iconsVersionFile: 'packages/view/package.json',
}

export const updateIconsAndCreatePr = (context: TriggerContext) => createIconsPkgUpdatePr(context, repoConfig)

export const handlers: RepoHandlers = {
  '/pr-vue': vueRepo.updateSiteDepsAndCreatePr,
  '/pr-vue-next': vueNextRepo.updateSiteDepsAndCreatePr,
  '/pr-react': reactRepo.updateSiteDepsAndCreatePr,
  '/pr-mobile-vue': mobileVueRepo.updateSiteDepsAndCreatePr,
  '/pr-mobile-react': mobileReactRepo.updateSiteDepsAndCreatePr,
  '/pr-miniprogram': miniprogramRepo.updateSiteDepsAndCreatePr,
}
