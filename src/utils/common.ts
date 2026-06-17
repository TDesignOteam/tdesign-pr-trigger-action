import type { WorkspaceManifest } from '@pnpm/workspace.read-manifest'
import type { TdesignRepo } from './trigger'
import process from 'node:process'
import { info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'
import { updateWorkspaceManifest } from '@pnpm/workspace.manifest-writer'
import { readWorkspaceManifest } from '@pnpm/workspace.read-manifest'
import {
  CHANGELOG_REG,
  CHANGELOG_SECTION_REG,
  NPM_REGISTRY,
  REMOVE_SKIP_CHANGELOG_REG,
  SKIP_CHANGELOG_REG,
  SUPPORTED_CHANGELOG_REPOS,
  WORKSPACE_MANIFEST_REPOS,
} from '../config/constants'

export function addContributor(body: string, contributor: string, link?: string): string {
  if (SKIP_CHANGELOG_REG.test(body)) {
    info(`不需要纳入 Changelog`)
    return body
  }

  const SKIP_LINES = ['', '<!--', '-->']
  const CHANGELOG_HEADER = '### 📝 更新日志'
  const CHECKLIST_HEADER = '### ☑️ 请求合并前的自查清单'

  let inChangelogSection = false

  return body.split('\r\n').map((item) => {
    if (SKIP_LINES.includes(item)) {
      return item
    }

    if (!inChangelogSection) {
      if (item === CHANGELOG_HEADER) {
        inChangelogSection = true
      }
      return item
    }

    if (item === CHECKLIST_HEADER) {
      inChangelogSection = false
      return item
    }

    if (CHANGELOG_REG.test(item)) {
      const logContent = link ? `${item} @${contributor} ${link}` : `${item} @${contributor}`
      return logContent
    }

    return item
  }).join('\r\n')
}

export function adaptChangelogForRepo(body: string, repo: TdesignRepo): string {
  if (SKIP_CHANGELOG_REG.test(body)) {
    info(`不需要纳入 Changelog`)
    return body
  }

  if (!SUPPORTED_CHANGELOG_REPOS.includes(repo as any)) {
    return body
  }

  // 先移除 "[ ] 本条 PR 不需要纳入 Changelog" 这一行
  let updatedBody = body.replace(REMOVE_SKIP_CHANGELOG_REG, '')

  // 使用正则表达式在 "### 📝 更新日志" 后插入 repoType
  const match = updatedBody.match(CHANGELOG_SECTION_REG)

  if (match) {
    const [, changelogHeader, whitespace, rest] = match
    updatedBody = updatedBody.replace(
      CHANGELOG_SECTION_REG,
      `${changelogHeader}${whitespace}#### ${repo}\r\n\r\n${rest}`,
    )
    info(`为 ${repo} 适配新的变更日志标识`)
  }

  return updatedBody
}

export async function getPkgLatestVersion(packageName: string): Promise<string> {
  const { stdout } = await getExecOutput('npm', ['view', packageName, 'version', `--registry=${NPM_REGISTRY}`])
  return stdout.trim()
}

export async function bumpIconsVersion(packageManager: string, repo: string): Promise<void> {
  if (packageManager === 'pnpm') {
    if (WORKSPACE_MANIFEST_REPOS.includes(repo as any)) {
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
  const updatePackageVersion = (catalog: Record<string, string>) => {
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
  }

  if (workspaceManifest.catalog) {
    updatePackageVersion(workspaceManifest.catalog)
  }

  if (workspaceManifest.catalogs) {
    for (const [key, catalog] of Object.entries(workspaceManifest.catalogs)) {
      updatePackageVersion(catalog)
      workspaceManifest.catalogs[key] = catalog
    }
  }

  return workspaceManifest
}
