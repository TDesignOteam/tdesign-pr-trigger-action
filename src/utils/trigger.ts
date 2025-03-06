import commonStart from '../tdesign/common'
import iconStart from '../tdesign/icons'
import useGithub from './github'

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
  // TODO
  switch (context.repo) {
    case 'tdesign-icons':
      iconStart(context)
      break
    case 'tdesign-common':
      commonStart(context)
      break
    case 'tdesign-pr-trigger-action':
      usingCopilotCodeReview(context)
      break
    default:
      throw new Error(`不支持的仓库: ${context.repo}`)
  }
}

function usingCopilotCodeReview(context: TriggerContext) {
  if (context.trigger !== '/copilot-code-review') {
    return
  }
  const { addReviewers } = useGithub(context)
  addReviewers(context.pr_number, ['Copilot'], [])
}
