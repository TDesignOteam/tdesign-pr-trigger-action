import iconStart from './icons'

export interface TriggerContext {
  owner: string
  repo: string
  pr_number: number
  token: string
  comment: string
}
export function useTrigger(context: TriggerContext) {
  // TODO
  switch (context.repo) {
    case 'tdesign-icons':
      iconStart(context)
      break
    default:
      throw new Error(`不支持的仓库: ${context.repo}`)
  }
}
