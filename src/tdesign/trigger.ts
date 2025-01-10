import iconStart from './icons'

export const iconsMap = {
  '/pr-vue': 'tdesign-icons-vue',
  '/pr-vue-next': 'tdesign-icons-vue-next',
  '/pr-react': 'tdesign-icons-react',
  '/pr-mobile-vue': 'tdesign-icons-vue-next',
  '/pr-mobile-react': 'tdesign-icons-react',
}
export const repoMap = {
  '/pr-vue': 'tdesign-vue',
  '/pr-vue-next': 'tdesign-vue-next',
  '/pr-react': 'tdesign-react',
  '/pr-mobile-vue': 'tdesign-mobile-vue',
  '/pr-mobile-react': 'tdesign-mobile-react',
}
export const ownerMap = {
  '/pr-vue': 'Tencent',
  '/pr-vue-next': 'liweijie0812',
  '/pr-react': 'Tencent',
  '/pr-mobile-vue': 'Tencent',
  '/pr-mobile-react': 'Tencent',
}

export interface TriggerContext {
  owner: string
  repo: string
  pr_number: number
  token: string
  comment: string
}
export default function useTrigger(context: TriggerContext) {
  // TODO
  switch (context.repo) {
    case 'tdesign-icons':
      iconStart(context)
      break
    default:
      throw new Error(`不支持的仓库: ${context.repo}`)
  }
}
