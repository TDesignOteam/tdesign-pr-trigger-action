import type { TriggerOperation } from './types'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { exec } from '@actions/exec'

export type PackageManager = 'npm' | 'pnpm'

export function enableCorepack(): TriggerOperation {
  return {
    name: '启用 Corepack',
    async run({ cwd, env }) {
      await exec('corepack', ['enable'], { cwd, env })
      const packageManager = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).packageManager
      if (!packageManager) {
        throw new Error('package.json 未声明 packageManager')
      }
      await exec('corepack', ['prepare', packageManager, '--activate'], { cwd, env })
    },
  }
}

export function installDependencies(packageManager: PackageManager): TriggerOperation {
  return {
    name: `使用 ${packageManager} 安装依赖`,
    async run({ cwd, env }) {
      await exec(packageManager, ['install'], { cwd, env })
    },
  }
}

export function runPackageScript(packageManager: PackageManager, script: string, options: { recursive?: boolean } = {}): TriggerOperation {
  return {
    name: `运行 ${script}`,
    async run({ cwd, env }) {
      const args = options.recursive && packageManager === 'pnpm'
        ? ['-r', 'run', script]
        : ['run', script]
      await exec(packageManager, args, { cwd, env })
    },
  }
}
