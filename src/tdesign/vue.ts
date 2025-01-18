import type { TriggerContext } from '../utils/trigger'

import { error } from 'node:console'

const supportTrigger = ['/update-common', '/update-snapshot']
export default async function run(context: TriggerContext) {
  if (!supportTrigger.includes(context.trigger)) {
    error(`${context.repo} 不支持 ${context.trigger} `)
  }
}
