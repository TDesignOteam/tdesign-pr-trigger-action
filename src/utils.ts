import { info } from '@actions/core'

export const SKIP_CHANGELOG_REG = /\[x\] 本条 PR 不需要纳入 Changelog/i
export const CHANGELOG_REG = /-\s([A-Z]+)(?:\(([A-Z\s_-]*)\))?\s*:\s*(.+)/i
export function addContributor(body: string, contributor: string): string {
  if (SKIP_CHANGELOG_REG.test(body)) {
    info(`不需要纳入 Changelog`)
    return body
  }

  let isSkip = true
  return body.split('\r\n').map((item) => {
    if (['', '<!--', '-->'].includes(item)) {
      return item
    }
    if (!isSkip) {
      if (item === '### ☑️ 请求合并前的自查清单') {
        isSkip = true
        return item
      }
      if (CHANGELOG_REG.test(item)) {
        // info(`匹配到更新日志项: ${item}`)
        return `${item} @${contributor}`
      }
    }
    if (item === '### 📝 更新日志') {
      isSkip = false
    }
    return item
  }).join('\r\n')
}
