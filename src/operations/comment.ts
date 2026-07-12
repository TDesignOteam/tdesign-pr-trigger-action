import type { TriggerOperation } from './types'
import process from 'node:process'

export function addProgressComment(actionName: string): TriggerOperation {
  return {
    name: '添加运行状态评论',
    async run({ github, prNumber }) {
      const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      await github.addComment(prNumber, `⏳ 正在运行${actionName}。CI: [Open](${runUrl})`)
    },
  }
}
