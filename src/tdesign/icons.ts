import type { RepoHandlers } from '../commands/types'
import * as miniprogramRepo from './miniprogram'
import * as mobileReactRepo from './mobile-react'
import * as mobileVueRepo from './mobile-vue'
import * as reactRepo from './react'
import * as vueRepo from './vue'
import * as vueNextRepo from './vue-next'

export const handlers: RepoHandlers = {
  '/pr-vue': vueRepo.updateIconsAndCreatePr,
  '/pr-vue-next': vueNextRepo.updateIconsAndCreatePr,
  '/pr-react': reactRepo.updateIconsAndCreatePr,
  '/pr-mobile-vue': mobileVueRepo.updateIconsAndCreatePr,
  '/pr-mobile-react': mobileReactRepo.updateIconsAndCreatePr,
  '/pr-miniprogram': miniprogramRepo.updateIconsAndCreatePr,
}
