import type { RepoHandlers } from '../commands/types'
import * as miniprogramRepo from './miniprogram'
import * as mobileReactRepo from './mobile-react'
import * as mobileVueRepo from './mobile-vue'
import * as reactRepo from './react'
import * as vueRepo from './vue'
import * as vueNextRepo from './vue-next'

export const handlers: RepoHandlers = {
  '/pr-vue': vueRepo.updateCommonAndCreatePr,
  '/pr-vue-next': vueNextRepo.updateCommonAndCreatePr,
  '/pr-react': reactRepo.updateCommonAndCreatePr,
  '/pr-mobile-vue': mobileVueRepo.updateCommonAndCreatePr,
  '/pr-mobile-react': mobileReactRepo.updateCommonAndCreatePr,
  '/pr-miniprogram': miniprogramRepo.updateCommonAndCreatePr,
}
