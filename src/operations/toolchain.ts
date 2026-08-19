import type { TriggerOperation } from './types'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const NODE_VERSION_PREFIX_REGEXP = /^v/

function resolveNodeBin(cwd: string, toolCache: string): string {
  const version = readFileSync(join(cwd, '.node-version'), 'utf8').trim().replace(NODE_VERSION_PREFIX_REGEXP, '')
  const nodeCache = join(toolCache, 'node')
  const cachedVersion = readdirSync(nodeCache, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(candidate => candidate === version || candidate.startsWith(`${version}.`))
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))[0]
  if (!cachedVersion) {
    throw new Error(`Runner 工具缓存中找不到 Node.js ${version}`)
  }

  const architecture = process.arch === 'arm64' ? 'arm64' : 'x64'
  const nodeBin = join(nodeCache, cachedVersion, architecture, 'bin')
  if (!existsSync(join(nodeBin, 'node'))) {
    throw new Error(`Node.js 工具目录无效: ${nodeBin}`)
  }
  return nodeBin
}

export function setupNode(): TriggerOperation {
  return {
    name: '设置 Node.js 工具链',
    async run({ cwd, env }) {
      const toolCache = process.env.RUNNER_TOOL_CACHE
      if (!toolCache) {
        throw new Error('RUNNER_TOOL_CACHE 未配置，无法加载 .node-version')
      }
      const nodeBin = resolveNodeBin(cwd, toolCache)
      env.PATH = `${nodeBin}:${env.PATH || ''}`
    },
  }
}
