import iconStart from './icons'

export const iconsMap = {
  '/pr-vue': 'tdesign-icons-vue',
  '/pr-vue-next': 'tdesign-icons-vue-next',
  '/pr-react': 'tdesign-icons-react',
}
export const repoMap = {
  '/pr-vue': 'tdesign-vue',
  '/pr-vue-next': 'tdesign-vue-next',
  '/pr-react': 'tdesign-react',
}
export const ownerMap = {
  '/pr-vue': 'Tencent',
  '/pr-vue-next': 'Tencent',
  '/pr-react': 'Tencent',
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
