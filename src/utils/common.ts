import type { WorkspaceManifest } from '@pnpm/workspace.read-manifest'
import type { TdesignRepo } from '../commands/types'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'
import { getOctokit } from '@actions/github'
import { updateWorkspaceManifest } from '@pnpm/workspace.manifest-writer'
import { readWorkspaceManifest } from '@pnpm/workspace.read-manifest'

export const SKIP_CHANGELOG_REG = /\[x\] 本条 PR 不需要纳入 Changelog/i
export const CHANGELOG_REG = /-\s([A-Z]+)(?:\(([A-Z\s_-]*)\))?\s*:\s*(.+)/i
export const REMOVE_SKIP_CHANGELOG_REG = /-\s\[ \] 本条 PR 不需要纳入 Changelog\r\n?/gi
export const CHANGELOG_SECTION_REG = /(### 📝 更新日志\r\n)([\r\n]*)(.*)/
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
  if (!['tdesign-vue-next', 'tdesign-react', 'tdesign-miniprogram'].includes(repo)) {
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
  const { stdout } = await getExecOutput('npm', [
    'view',
    packageName,
    'version',
    '--registry=https://registry.npmjs.org/',
  ])
  return stdout.trim()
}

export async function getPkgVersionFromRepo(owner: string, repo: string, filePath: string) {
  const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/develop/${filePath}`)
  if (!res.ok) {
    throw new Error(`读取 ${owner}/${repo}@develop ${filePath} 失败: ${res.status}`)
  }
  const text = await res.text()
  if (filePath.endsWith('.json')) {
    return (JSON.parse(text) as { version?: string }).version || ''
  }
  const match = text.match(/^version:\s*('?)([^'\s]+)\1/m)
  return match?.[2] || ''
}

function findPackageJsonFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
        continue
      }
      results.push(...findPackageJsonFiles(join(dir, entry.name)))
    }
    else if (entry.name === 'package.json') {
      results.push(join(dir, entry.name))
    }
  }
  return results
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function bumpPackageDeps(repo: string, deps: string[], versions: Record<string, string> = {}) {
  const latestVersions = { ...versions }
  for (const dep of deps) {
    if (!latestVersions[dep]) {
      latestVersions[dep] = await getPkgLatestVersion(dep)
    }
  }

  for (const filePath of findPackageJsonFiles(`./${repo}`)) {
    const content = readFileSync(filePath, 'utf-8')
    let updated = content
    for (const dep of deps) {
      const latest = latestVersions[dep]
      if (!latest) {
        continue
      }
      // 正则改写依赖版本，保留原文件格式与其他依赖不动
      const reg = new RegExp(`("${escapeRegExp(dep)}":\\s*)"([^"]*)"`, 'g')
      updated = updated.replace(reg, (match, prefix: string, ver: string) => {
        // 跳过 workspace:/catalog:/file:/git 等协议依赖
        if (ver.includes(':')) {
          return match
        }
        if (ver.startsWith('^') || ver.startsWith('~')) {
          return `${prefix}"${ver.slice(0, 1)}${latest}"`
        }
        if (/^\d/.test(ver)) {
          return `${prefix}"${latest}"`
        }
        return match
      })
    }
    if (updated !== content) {
      writeFileSync(filePath, updated)
      info(`已更新 ${filePath}`)
    }
  }

  await exec('pnpm', ['install'], {
    cwd: `./${repo}`,
    env: { ...process.env, CI: 'false' }, // CI 下 pnpm install 走 frozen-lockfile，需关闭才能更新 lockfile
  })
}

export async function bumpPubDependency(repo: string, packageName: string, version: string, pubspecPath: string) {
  const filePath = `./${repo}/${pubspecPath}`
  const content = readFileSync(filePath, 'utf-8')
  const reg = new RegExp(`^(\\s*${packageName}:\\s*)\\S+`, 'm')
  if (!reg.test(content)) {
    throw new Error(`${filePath} 中未找到 ${packageName} 依赖`)
  }
  writeFileSync(filePath, content.replace(reg, `$1^${version}`))
  await exec('git', ['status'], { cwd: `./${repo}` })
}

export async function bumpIconsVersion(packageManager: string, repo: string) {
  if (packageManager === 'pnpm') {
    if (repo === 'tdesign-vue-next' || repo === 'tdesign-miniprogram') {
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
      await exec('pnpm', [
        '--recursive',
        'update',
        'tdesign-icons-*',
        '--latest',
      ], { cwd: `./${repo}` })
    }
  }
  else {
    await exec('npx', ['npm-check-updates', 'tdesign-icons-*', '-u'], { cwd: `./${repo}` })
  }

  await exec('git', ['status'], { cwd: `./${repo}` })
}
export async function bumpSiteDeps(packageManager: string, repo: string, deps: string[]) {
  if (packageManager === 'pnpm') {
    const workspaceManifest = await readWorkspaceManifest(`./${repo}`)
    if (workspaceManifest && (workspaceManifest.catalog || workspaceManifest.catalogs)) {
      let updated = workspaceManifest
      for (const dep of deps) {
        updated = updateCatalogs(updated, dep, await getPkgLatestVersion(dep))
      }
      await updateWorkspaceManifest(`./${repo}`, { updatedFields: updated })
      await exec('pnpm', ['install', '--force'], {
        cwd: `./${repo}`,
        env: { ...process.env, CI: 'false' },
      })
    }
    else {
      // pnpm update --latest 会连带更新其他依赖，改为直接改写 package.json 后重新安装
      await bumpPackageDeps(repo, deps)
    }
  }
  else {
    await exec('npx', ['npm-check-updates', ...deps, '-u'], { cwd: `./${repo}` })
  }

  await exec('git', ['status'], { cwd: `./${repo}` })
}

export async function corepackEnable() {
  await exec('corepack', ['enable'])
}
export function updateCatalogs(workspaceManifest: WorkspaceManifest, packageName: string, version: string) {
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
