import type { TriggerContext } from '../utils/trigger'
import { exec } from '@actions/exec'
import { targetConfigs } from './config'
import { updateCurrentCommon, updateCurrentCoverage, updateCurrentSnapshot } from './current-pr'
import { createTargetModule } from './target-module'

const target = targetConfigs['/pr-vue-next']
const commonConflicts = [{ matches: (file: string) => file === 'packages/common', strategy: 'ours' as const }]
const snapshotConflicts = [{ matches: (file: string) => file.endsWith('.snap'), strategy: 'theirs' as const }, ...commonConflicts]

export function updateCommon(context: TriggerContext) {
  return updateCurrentCommon(context, target, { conflictRules: commonConflicts })
}
export function updateSnapshot(context: TriggerContext) {
  return updateCurrentSnapshot(context, target, {
    conflictRules: snapshotConflicts,
    runSnapshot: async (repoPath) => { await exec('pnpm', ['-F', '@tdesign/vue-next-test', 'run', 'test:update'], { cwd: repoPath }) },
  })
}
export function updateCoverage(context: TriggerContext) {
  return updateCurrentCoverage(context, target)
}

const vueNext = createTargetModule(target, { updateCommon, updateSnapshot, updateCoverage })
export default vueNext
