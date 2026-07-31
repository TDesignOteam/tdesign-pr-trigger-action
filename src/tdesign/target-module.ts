import type { TargetConfig, TargetModule, TargetOperations } from './types'
import propagateCommon from './common'
import updateIcons from './icons'

export function createTargetModule(target: TargetConfig, operations: TargetOperations): TargetModule {
  const targetModule: TargetModule = {
    propagateCommon: context => propagateCommon(context, target),
    updateIcons: context => updateIcons(context, target),
    ...operations,
    async run(context) {
      switch (context.repo) {
        case 'tdesign-common':
          return targetModule.propagateCommon(context)
        case 'tdesign-icons':
          return targetModule.updateIcons(context)
        default:
          throw new Error(`${target.repo} 不支持来源仓库: ${context.repo}`)
      }
    },
  }
  return targetModule
}
