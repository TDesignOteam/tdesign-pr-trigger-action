import commonStart from '../tdesign/common'
import iconStart from '../tdesign/icons'

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
}
export const ownerMap = {
  '/pr-vue': 'Tencent',
  '/pr-vue-next': 'Tencent',
  '/pr-react': 'Tencent',
  '/pr-mobile-vue': 'Tencent',
  '/pr-mobile-react': 'Tencent',
  '/pr-miniprogram': 'Tencent',
}

export interface TriggerContext {
  owner: string
  repo: string
  pr_number: number
  token: string
  trigger: string
}
export default function useTrigger(context: TriggerContext) {
  // TODO
  switch (context.repo) {
    case 'tdesign-icons':
      iconStart(context)
      break
    case 'tdesign-common':
      commonStart(context)
      break
    default:
      throw new Error(`不支持的仓库: ${context.repo}`)
  }
}
