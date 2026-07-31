import type { AutoPrTrigger } from '../utils/trigger'
import type { TargetConfig } from './types'

export const targetConfigs: Record<AutoPrTrigger, TargetConfig> = {
  '/pr-vue': {
    owner: 'Tencent',
    repo: 'tdesign-vue',
    packageManager: 'npm',
    iconPackage: 'tdesign-icons-vue',
    commonPath: 'src/_common',
    coverageCommands: [['run', 'generate:coverage-badge']],
  },
  '/pr-vue-next': {
    owner: 'Tencent',
    repo: 'tdesign-vue-next',
    packageManager: 'pnpm',
    iconPackage: 'tdesign-icons-vue-next',
    commonPath: 'packages/common',
    coverageCommands: [['-F', '@tdesign/vue-next-test', 'run', 'generate:coverage-badge']],
  },
  '/pr-react': {
    owner: 'Tencent',
    repo: 'tdesign-react',
    packageManager: 'pnpm',
    iconPackage: 'tdesign-icons-react',
    commonPath: 'packages/common',
    coverageCommands: [['run', 'generate:coverage-badge']],
  },
  '/pr-mobile-vue': {
    owner: 'Tencent',
    repo: 'tdesign-mobile-vue',
    packageManager: 'npm',
    iconPackage: 'tdesign-icons-vue-next',
    commonPath: 'src/_common',
    coverageCommands: [['run', 'generate:coverage-badge']],
  },
  '/pr-mobile-react': {
    owner: 'Tencent',
    repo: 'tdesign-mobile-react',
    packageManager: 'npm',
    iconPackage: 'tdesign-icons-react',
    commonPath: 'src/_common',
    coverageCommands: [['run', 'generate:coverage-badge']],
  },
  '/pr-miniprogram': {
    owner: 'Tencent',
    repo: 'tdesign-miniprogram',
    packageManager: 'pnpm',
    iconPackage: 'cdn-iconfont',
    commonPath: 'packages/common',
    coverageCommands: [['run', 'cover'], ['run', 'badge']],
  },
}
