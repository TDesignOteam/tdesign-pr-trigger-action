import type { TriggerContext } from '../utils/trigger'
import { error, info } from '@actions/core'

import useGithub from 'src/utils/github'

const supportTrigger = ['/update-common', '/update-snapshot']
export default async function run(context: TriggerContext) {
  if (!supportTrigger.includes(context.trigger)) {
    error(`${context.repo} 不支持 ${context.trigger} `)
  }
  const { getPrData } = useGithub({ repo: context.repo, owner: context.owner, token: context.token })
  const prData = await getPrData(context.pr_number)
  info(`getPrData:${JSON.stringify(prData, null, 2)}`)
  if (!prData.maintainer_can_modify) {
    error(`pr:${context.pr_number} 不允许维护者修改`)
  }
}
