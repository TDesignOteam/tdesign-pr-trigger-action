import type { RepoHandlers, TriggerContext } from './types'
import { repoScopedTriggers } from './definitions'

const repoRegistry = new Map<string, RepoHandlers>()
const globalHandlers: RepoHandlers = {}

export function registerRepoHandlers(repo: string, handlers: RepoHandlers) {
  repoRegistry.set(repo, {
    ...repoRegistry.get(repo),
    ...handlers,
  })
}

export function registerGlobalHandlers(handlers: RepoHandlers) {
  Object.assign(globalHandlers, handlers)
}

function isRepoScopedTrigger(trigger: string) {
  return repoScopedTriggers.has(trigger)
}

export default async function useTrigger(context: TriggerContext) {
  const repoHandlers = repoRegistry.get(context.repo)
  const handler = repoHandlers?.[context.trigger] ?? globalHandlers[context.trigger]
  if (!handler) {
    if (isRepoScopedTrigger(context.trigger)) {
      throw new Error(`该仓库未适配: ${context.repo}`)
    }
    throw new Error(`未支持的触发器: ${context.trigger}`)
  }
  await handler(context)
}
