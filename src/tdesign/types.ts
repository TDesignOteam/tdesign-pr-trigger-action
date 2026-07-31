import type { TriggerContext } from '../utils/trigger'

export type TargetRepo = 'tdesign-vue' | 'tdesign-vue-next' | 'tdesign-react' | 'tdesign-mobile-vue' | 'tdesign-mobile-react' | 'tdesign-miniprogram'

export interface TargetConfig {
  owner: string
  repo: TargetRepo
  packageManager: string
  iconPackage: string
  commonPath: string
  coverageCommands: string[][]
}

export interface TargetOperations {
  updateCommon: (context: TriggerContext) => Promise<void>
  updateSnapshot: (context: TriggerContext) => Promise<void>
  updateCoverage: (context: TriggerContext) => Promise<void>
  updateAiCore?: (context: TriggerContext) => Promise<void>
}

export interface TargetModule extends TargetOperations {
  propagateCommon: (context: TriggerContext) => Promise<void | boolean>
  updateIcons: (context: TriggerContext) => Promise<void | boolean>
  run: (context: TriggerContext) => Promise<void | boolean>
}
