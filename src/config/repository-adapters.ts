import type { RepositoryAdapter, TriggerOperation } from '../operations'
import type { RepositoryTrigger } from '../utils/trigger'
import { apiAdapter } from '../tdesign/api'
import { miniprogramAdapter } from '../tdesign/miniprogram'
import { mobileReactAdapter } from '../tdesign/mobile-react'
import { mobileVueAdapter } from '../tdesign/mobile-vue'
import { reactAdapter } from '../tdesign/react'
import { vueAdapter } from '../tdesign/vue'
import { vueNextAdapter } from '../tdesign/vue-next'

export const REPOSITORY_ADAPTERS: Record<string, RepositoryAdapter> = {
  'tdesign-api': apiAdapter,
  'tdesign-vue': vueAdapter,
  'tdesign-vue-next': vueNextAdapter,
  'tdesign-react': reactAdapter,
  'tdesign-mobile-vue': mobileVueAdapter,
  'tdesign-mobile-react': mobileReactAdapter,
  'tdesign-miniprogram': miniprogramAdapter,
}

export function getRepositoryOperations(repo: string, trigger: RepositoryTrigger): TriggerOperation[] | undefined {
  return REPOSITORY_ADAPTERS[repo]?.[trigger]
}
