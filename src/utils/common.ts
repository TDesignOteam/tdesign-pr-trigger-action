import type { WorkspaceManifest } from '@pnpm/workspace.read-manifest'
import { info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'
import { getOctokit } from '@actions/github'
import { updateWorkspaceManifest } from '@pnpm/workspace.manifest-writer'
import { readWorkspaceManifest } from '@pnpm/workspace.read-manifest'

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
    if (repo === 'tdesign-vue-next') {
      let workspaceManifest = await readWorkspaceManifest(`./${repo}`)
      if (workspaceManifest) {
        const iconsVueNextVersion = await getPkgLatestVersion('tdesign-icons-vue-next')
        workspaceManifest = updateCatalogs(workspaceManifest, 'tdesign-icons-vue-next', iconsVueNextVersion)
        const iconsViewVersion = await getPkgLatestVersion('tdesign-icons-view')
        workspaceManifest = updateCatalogs(workspaceManifest, 'tdesign-icons-view', iconsViewVersion)
        await updateWorkspaceManifest(`./${repo}`, workspaceManifest)
        await exec('pnpm', ['install'], { cwd: `./${repo}` })
      }
    }
    else {
      await exec('npx', ['npm-check-updates', 'tdesign-icons-*', '-u'], { cwd: `./${repo}` })
    }

    await exec('git', ['status'], { cwd: `./${repo}` })
  }
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
