import { info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'
import { getOctokit } from '@actions/github'

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

export async function cloneRepo(owner: string, repo: string, token: string): Promise<void> {
  const repo_url = `https://${token}@github.com/${owner}/${repo}.git`
  await exec('git', ['clone', repo_url, `../${repo}`])
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
export interface CreatePRContext {
  owner: string
  repo: string
  title: string
  head: string
  base?: string
  body: string
  token: string
}
export async function createPR(context: CreatePRContext) {
  const octokit = getOctokit(context.token)
  await octokit.rest.pulls.create({
    owner: context.owner,
    repo: context.repo,
    title: context.title,
    head: context.head,
    base: context?.base || 'develop',
    body: context.body,
  })
}
export async function getPkgLatestVersion(packageName: string) {
  const { stdout } = await getExecOutput('npm', ['view', packageName, 'version'])
  return stdout.trim()
}

export async function bumpIconsVersion(packageManager: string, repo: string) {
  if (packageManager === 'pnpm') {
    await exec('pnpm', ['--recursive', 'update', 'tdesign-icons-*', '--latest'], { cwd: `../${repo}` })
  }
  else {
    await exec('npx', ['npm-check-updates', 'tdesign-icons-*', '-u'], { cwd: `../${repo}` })
  }

  await exec('git', ['status'], { cwd: `../${repo}` })
}

export async function corepackEnable() {
  await exec('corepack', ['enable'])
}

export async function setGitConfig() {
  await exec(`git config --global user.email "tdesign@tencent.com"`)
  await exec(`git config --global user.name "tdesign-bot"`)
}

export async function createBranch(repo: string, branch: string) {
  await exec(`git checkout -b ${branch}`, [], { cwd: `../${repo}` })
  return branch
}

export async function gitCommit(repo: string, message: string) {
  await exec(`git commit -am "${message}" --no-verify`, [], { cwd: `../${repo}` })
}

export async function gitPush(repo: string, branch: string) {
  await exec(`git push origin ${branch}`, [], { cwd: `../${repo}` })
}
