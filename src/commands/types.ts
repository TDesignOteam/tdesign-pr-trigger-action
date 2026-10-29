export type AutoPrTrigger = '/pr-vue' | '/pr-vue-next' | '/pr-react' | '/pr-mobile-vue' | '/pr-mobile-react' | '/pr-miniprogram'
export type Trigger = AutoPrTrigger | '/update-common' | '/update-snapshot' | '/update-coverage' | '/upgrade-deps' | '/delete-cnb-branch' | '/update-site'
export type TdesignRepo = 'tdesign-vue' | 'tdesign-vue-next' | 'tdesign-react' | 'tdesign-mobile-vue' | 'tdesign-mobile-react' | 'tdesign-miniprogram'
export type SourceRepo = 'tdesign-common' | 'tdesign-icons' | TdesignRepo

export interface TriggerContext {
  owner: string
  repo: string
  pr_number: number
  token: string
  trigger: Trigger
  dry_run: boolean
  args?: string
  comment_id?: number
}

export type CommandHandler = (context: TriggerContext) => Promise<unknown>
export type RepoHandlers = Partial<Record<Trigger, CommandHandler>>
