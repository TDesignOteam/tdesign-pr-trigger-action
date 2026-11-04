import type { AutoPrTrigger, RepoHandlers, TriggerContext } from '../commands/types'
import { GithubHelper } from '../utils/github-helper'
import * as flutterRepo from './flutter'
import * as miniprogramRepo from './miniprogram'
import * as mobileReactRepo from './mobile-react'
import * as mobileVueRepo from './mobile-vue'
import * as reactRepo from './react'
import * as tdesignRepo from './tdesign'
import * as vueRepo from './vue'
import * as vueNextRepo from './vue-next'

const prHandlers = {
  '/pr-vue': vueRepo.updateIconsAndCreatePr,
  '/pr-vue-next': vueNextRepo.updateIconsAndCreatePr,
  '/pr-react': reactRepo.updateIconsAndCreatePr,
  '/pr-mobile-vue': mobileVueRepo.updateIconsAndCreatePr,
  '/pr-mobile-react': mobileReactRepo.updateIconsAndCreatePr,
  '/pr-miniprogram': miniprogramRepo.updateIconsAndCreatePr,
  '/pr-tdesign': tdesignRepo.updateIconsAndCreatePr,
  '/pr-flutter': flutterRepo.updateIconsAndCreatePr,
} satisfies Pick<RepoHandlers, AutoPrTrigger>

async function commentAllPrCommands(context: TriggerContext) {
  const githubHelper = new GithubHelper({
    owner: context.owner,
    repo: context.repo,
    token: context.token,
    dryRun: context.dry_run,
  })
  const sent: string[] = []
  for (const command of Object.keys(prHandlers)) {
    try {
      await githubHelper.addComment(context.pr_number, command)
      sent.push(command)
    }
    catch (cause) {
      throw new Error(`发送 ${command} 评论失败，已发送: ${sent.join(', ') || '无'}；请勿重复发送已成功的指令`, { cause })
    }
  }
}

export const handlers: RepoHandlers = {
  ...prHandlers,
  '/pr-all': commentAllPrCommands,
}
