import type { AutoPrTrigger } from '../utils/trigger'
import type { TargetConfig } from './types'

export const targetConfigs: Record<AutoPrTrigger, TargetConfig> = {
  '/pr-vue': { owner: 'Tencent', repo: 'tdesign-vue', packageManager: 'npm', iconPackage: 'tdesign-icons-vue' },
  '/pr-vue-next': { owner: 'Tencent', repo: 'tdesign-vue-next', packageManager: 'pnpm', iconPackage: 'tdesign-icons-vue-next' },
  '/pr-react': { owner: 'Tencent', repo: 'tdesign-react', packageManager: 'pnpm', iconPackage: 'tdesign-icons-react' },
  '/pr-mobile-vue': { owner: 'Tencent', repo: 'tdesign-mobile-vue', packageManager: 'npm', iconPackage: 'tdesign-icons-vue-next' },
  '/pr-mobile-react': { owner: 'Tencent', repo: 'tdesign-mobile-react', packageManager: 'npm', iconPackage: 'tdesign-icons-react' },
  '/pr-miniprogram': { owner: 'Tencent', repo: 'tdesign-miniprogram', packageManager: 'pnpm', iconPackage: 'cdn-iconfont' },
}
