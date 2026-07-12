import type { TriggerOperation } from './types'
import { exec } from '@actions/exec'

export function updateSubmodule(path: string, options: { merge?: boolean } = {}): TriggerOperation {
  return {
    name: `更新子模块 ${path}`,
    async run({ cwd }) {
      const args = ['submodule', 'update', '--init', '--remote']
      if (options.merge) {
        args.push('--merge')
      }
      args.push('--', path)
      await exec('git', args, { cwd })
    },
  }
}
