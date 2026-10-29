import { handlers as commonRepoHandlers } from '../tdesign/common'
import { handlers as iconsRepoHandlers } from '../tdesign/icons'
import { handlers as miniprogramRepoHandlers } from '../tdesign/miniprogram'
import { handlers as mobileReactRepoHandlers } from '../tdesign/mobile-react'
import { handlers as mobileVueRepoHandlers } from '../tdesign/mobile-vue'
import { handlers as reactRepoHandlers } from '../tdesign/react'
import { handlers as vueRepoHandlers } from '../tdesign/vue'
import { handlers as vueNextRepoHandlers } from '../tdesign/vue-next'
import { deleteCnbBranch } from './generic/delete-cnb-branch'
import { updateSite } from './generic/update-site'
import { upgradeDeps } from './generic/upgrade-deps'
import useTrigger, { registerGlobalHandlers, registerRepoHandlers } from './registry'

registerRepoHandlers('tdesign-common', commonRepoHandlers)
registerRepoHandlers('tdesign-icons', iconsRepoHandlers)
registerRepoHandlers('tdesign-vue', vueRepoHandlers)
registerRepoHandlers('tdesign-vue-next', vueNextRepoHandlers)
registerRepoHandlers('tdesign-react', reactRepoHandlers)
registerRepoHandlers('tdesign-mobile-vue', mobileVueRepoHandlers)
registerRepoHandlers('tdesign-mobile-react', mobileReactRepoHandlers)
registerRepoHandlers('tdesign-miniprogram', miniprogramRepoHandlers)

registerGlobalHandlers({
  '/upgrade-deps': upgradeDeps,
  '/delete-cnb-branch': deleteCnbBranch,
  '/update-site': updateSite,
})

export default useTrigger
