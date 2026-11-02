import type { RepoHandlers } from '../commands/types'
import * as miniprogramRepo from './miniprogram'
import * as mobileReactRepo from './mobile-react'
import * as mobileVueRepo from './mobile-vue'
import * as reactRepo from './react'
import * as vueRepo from './vue'
import * as vueNextRepo from './vue-next'

export const handlers: RepoHandlers = {
  '/pr-vue': vueRepo.updateSiteDepsAndCreatePr,
  '/pr-vue-next': vueNextRepo.updateSiteDepsAndCreatePr,
  '/pr-react': reactRepo.updateSiteDepsAndCreatePr,
  '/pr-mobile-vue': mobileVueRepo.updateSiteDepsAndCreatePr,
  '/pr-mobile-react': mobileReactRepo.updateSiteDepsAndCreatePr,
  '/pr-miniprogram': miniprogramRepo.updateSiteDepsAndCreatePr,
}
