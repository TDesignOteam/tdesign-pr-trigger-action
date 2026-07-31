import type { TriggerContext } from '../utils/trigger'
import { exec } from '@actions/exec'
import { targetConfigs } from './config'
import { updateCurrentCommon, updateCurrentCoverage, updateCurrentSnapshot } from './current-pr'
import { createTargetModule } from './target-module'

const target = targetConfigs['/pr-mobile-react']
const commonConflicts = [{ matches: (file: string) => file === 'packages/common', strategy: 'ours' as const }]
const snapshotConflicts = [{ matches: (file: string) => file.endsWith('.snap'), strategy: 'theirs' as const }, ...commonConflicts]
async function afterCommonMerge(repoPath: string) {
  await exec('npm', ['run', 'api:css', 'all'], { cwd: repoPath })
}

export function updateCommon(context: TriggerContext) {
  return updateCurrentCommon(context, target, { conflictRules: commonConflicts, afterMerge: afterCommonMerge })
}
export function updateSnapshot(context: TriggerContext) {
  return updateCurrentSnapshot(context, target, {
    conflictRules: snapshotConflicts,
    runSnapshot: async (repoPath) => { await exec('npm', ['run', 'test:update'], { cwd: repoPath }) },
  })
}
export function updateCoverage(context: TriggerContext) {
  return updateCurrentCoverage(context, target)
}

const mobileReact = createTargetModule(target, { updateCommon, updateSnapshot, updateCoverage })
export default mobileReact
