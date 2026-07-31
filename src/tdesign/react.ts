import type { TriggerContext } from '../utils/trigger'
import { exec } from '@actions/exec'
import { targetConfigs } from './config'
import { updateCurrentAiCore, updateCurrentCommon, updateCurrentCoverage, updateCurrentSnapshot } from './current-pr'
import { createTargetModule } from './target-module'

const target = targetConfigs['/pr-react']
const commonConflicts = [
  { matches: (file: string) => file === 'packages/common', strategy: 'ours' as const },
  { matches: (file: string) => file === 'packages/ai-core', strategy: 'theirs' as const },
]
const snapshotConflicts = [
  { matches: (file: string) => file.endsWith('.snap'), strategy: 'theirs' as const },
  ...commonConflicts,
]

export function updateCommon(context: TriggerContext) {
  return updateCurrentCommon(context, target, { conflictRules: commonConflicts })
}
export function updateAiCore(context: TriggerContext) {
  return updateCurrentAiCore(context, target, [
    { matches: (file: string) => file === 'packages/common', strategy: 'theirs' as const },
    { matches: (file: string) => file === 'packages/ai-core', strategy: 'ours' as const },
  ])
}
export function updateSnapshot(context: TriggerContext) {
  return updateCurrentSnapshot(context, target, {
    conflictRules: snapshotConflicts,
    runSnapshot: async (repoPath) => { await exec('pnpm', ['run', 'test:update'], { cwd: repoPath }) },
  })
}
export function updateCoverage(context: TriggerContext) {
  return updateCurrentCoverage(context, target)
}

const react = createTargetModule(target, { updateCommon, updateAiCore, updateSnapshot, updateCoverage })
export default react
