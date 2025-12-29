import type { WorkspaceManifest } from '@pnpm/workspace.read-manifest'
import type { TdesignRepo } from './trigger'
import process from 'node:process'
import { info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'
import { getOctokit } from '@actions/github'
import { updateWorkspaceManifest } from '@pnpm/workspace.manifest-writer'
import { readWorkspaceManifest } from '@pnpm/workspace.read-manifest'

export const SKIP_CHANGELOG_REG = /\[x\] 本条 PR 不需要纳入 Changelog/i
export const CHANGELOG_REG = /-\s([A-Z]+)(?:\(([A-Z\s_-]*)\))?\s*:\s*(.+)/i
export function addContributor(body: string, contributor: string, link?: string): string {
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
        let logContent = `${item} @${contributor}`
        if (link) {
          logContent += ` ${link}`
        }

        return logContent
      }
    }
    if (item === '### 📝 更新日志') {
      isSkip = false
    }
    return item
  }).join('\r\n')
}

export function adaptChangelogForRepo(body: string, repo: TdesignRepo): string {
  if (SKIP_CHANGELOG_REG.test(body)) {
    info(`不需要纳入 Changelog`)
    return body
  }
  if (!['tdesign-vue-next', 'tdesign-react'].includes(repo)) {
    return body
  }

  // 先移除 "[ ] 本条 PR 不需要纳入 Changelog" 这一行
  const removeSkipChangelogRegex = /-\s\[ \] 本条 PR 不需要纳入 Changelog\r\n?/gi
  let updatedBody = body.replace(removeSkipChangelogRegex, '')

  // 使用正则表达式在 "### 📝 更新日志" 后插入 repoType
  const changelogSectionRegex = /(### 📝 更新日志\r\n)([\r\n]*)(.*)/
  const match = updatedBody.match(changelogSectionRegex)

  if (match) {
    const [, changelogHeader, whitespace, rest] = match
    updatedBody = updatedBody.replace(
      changelogSectionRegex,
      `${changelogHeader}${whitespace}#### ${repo}\r\n\r\n${rest}`,
    )
    info(`为 ${repo} 适配新的变更日志标识`)
  }

  return updatedBody
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
  const { stdout } = await getExecOutput('npm', ['view', packageName, 'version', '--registry=https://registry.npmjs.org/'])
  return stdout.trim()
}

export async function bumpIconsVersion(packageManager: string, repo: string) {
  if (packageManager === 'pnpm') {
    if (repo === 'tdesign-vue-next') {
      let workspaceManifest = await readWorkspaceManifest(`./${repo}`)
      if (workspaceManifest) {
        const iconsVueNextVersion = await getPkgLatestVersion('tdesign-icons-vue-next')
        workspaceManifest = updateCatalogs(workspaceManifest, 'tdesign-icons-vue-next', iconsVueNextVersion)
        const iconsViewVersion = await getPkgLatestVersion('tdesign-icons-view')
        workspaceManifest = updateCatalogs(workspaceManifest, 'tdesign-icons-view', iconsViewVersion)
        await updateWorkspaceManifest(`./${repo}`, { updatedFields: workspaceManifest })

        await exec('pnpm', ['install', '--force'], {
          cwd: `./${repo}`,
          env: { ...process.env, CI: 'false' }, // Disable CI environment variable
        })
      }
    }
    else {
      await exec('pnpm', ['--recursive', 'update', 'tdesign-icons-*', '--latest'], { cwd: `./${repo}` })
    }
  }
  else {
    await exec('npx', ['npm-check-updates', 'tdesign-icons-*', '-u'], { cwd: `./${repo}` })
  }

  await exec('git', ['status'], { cwd: `./${repo}` })
}
export async function corepackEnable() {
  await exec('corepack', ['enable'])
}
function updateCatalogs(workspaceManifest: WorkspaceManifest, packageName: string, version: string) {
  if (workspaceManifest.catalog) {
    for (const [name, ver] of Object.entries(workspaceManifest.catalog)) {
      if (name === packageName) {
        if (ver.startsWith('^') || ver.startsWith('~')) {
          workspaceManifest.catalog[name] = `${ver.slice(0, 1)}${version}`
        }
        else {
          workspaceManifest.catalog[name] = version
        }
      }
    }
  }
  if (workspaceManifest.catalogs) {
    for (const [key, catalog] of Object.entries(workspaceManifest.catalogs)) {
      for (const [name, ver] of Object.entries(catalog)) {
        if (name === packageName) {
          if (ver.startsWith('^') || ver.startsWith('~')) {
            catalog[name] = `${ver.slice(0, 1)}${version}`
          }
          else {
            catalog[name] = version
          }
        }
      }
      workspaceManifest.catalogs[key] = catalog
    }
  }

  return workspaceManifest
}
