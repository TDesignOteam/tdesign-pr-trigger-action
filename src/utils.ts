import { info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'
import { getOctokit } from '@actions/github'

export const SKIP_CHANGELOG_REG = /\[x\] 本条 PR 不需要纳入 Changelog/i
export const CHANGELOG_REG = /-\s([A-Z]+)(?:\(([A-Z\s_-]*)\))?\s*:\s*(.+)/i
export type Repo = 'tdesign-common' | 'tdesign-icons'
export const frameworkDirective: Record<Repo, string[]> = {
  'tdesign-common': ['/pr-vue', '/pr-vue-next', '/pr-react', '/pr-mobile-vue', '/pr-mobile-react'],
  'tdesign-icons': ['/pr-vue', '/pr-vue-next', '/pr-react', '/pr-mobile-vue', '/pr-mobile-react'],
}

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

export async function cloneRepo(owner: string, repo: string, token: string): Promise<void> {
  const repo_url = `https://${token}@github.com/${owner}/${repo}.git`
  await exec('git', ['clone', repo_url, `../${repo}`])
}

export function checkRepo(repo: Repo) {
  const frameworks = Object.keys(frameworkDirective) as Repo[]
  if (!frameworks.includes(repo)) {
    throw new Error(`不在白名单中: ${repo}`)
  }
}

export async function getPrData(owner: string, repo: string, pr_number: number, token: string) {
  const octokit = getOctokit(token)
  const { data: pr_data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pr_number as number,
  })
  return pr_data
}

export async function createPR(owner: string, repo: string, pr_number: number, token: string) {
  const octokit = getOctokit(token)
  await octokit.rest.pulls.create({
    owner,
    repo,
    title: 'chore: update common',
    head: `chore/update-common/pr${pr_number}`,
    base: 'develop',
    body: '',
  })
}
export async function getPkgLatestVersion(packageName: string) {
  const { stdout } = await getExecOutput('npm', ['view', packageName, 'version'])
  return stdout.trim()
}

export async function updateIcons(repo: string) {
  await exec('npx', ['npm-check-updates', 'tdesign-icons-*', '-u'], { cwd: `../${repo}` })
  await exec('git', ['status'], { cwd: `../${repo}` })
}
