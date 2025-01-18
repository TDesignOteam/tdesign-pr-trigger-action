import { error } from '@actions/core'
import common from '../tdesign/common'
import icons from '../tdesign/icons'
import vue from '../tdesign/vue'

export const iconsMap = {
  '/pr-vue': 'tdesign-icons-vue',
  '/pr-vue-next': 'tdesign-icons-vue-next',
  '/pr-react': 'tdesign-icons-react',
  '/pr-mobile-vue': 'tdesign-icons-vue-next',
  '/pr-mobile-react': 'tdesign-icons-react',
  '/pr-miniprogram': 'cdn-iconfont',
}
export const repoMap = {
  '/pr-vue': 'tdesign-vue',
  '/pr-vue-next': 'tdesign-vue-next',
  '/pr-react': 'tdesign-react',
  '/pr-mobile-vue': 'tdesign-mobile-vue',
  '/pr-mobile-react': 'tdesign-mobile-react',
  '/pr-miniprogram': 'tdesign-miniprogram',
  '/pr-flutter': 'tdesign-flutter',
}
export const ownerMap = {
  '/pr-vue': 'Tencent',
  '/pr-vue-next': 'Tencent',
  '/pr-react': 'Tencent',
  '/pr-mobile-vue': 'Tencent',
  '/pr-mobile-react': 'Tencent',
  '/pr-miniprogram': 'Tencent',
  '/pr-flutter': 'Tencent',
}

export interface TriggerContext {
  owner: string
  repo: string
  pr_number: number
  token: string
  trigger: string
}
export default function useTrigger(context: TriggerContext) {
  const triggerRun = {
    'tdesign-icons': () => icons(context),
    'tdesign-common': () => common(context),
    'tdesign-vue': () => vue(context),
  }
  if (!Reflect.has(triggerRun, context.repo)) {
    error(`${context.repo} 未适配`)
  }

  triggerRun[context.trigger]()
}
