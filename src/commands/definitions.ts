import type { AutoPrTrigger, TdesignRepo } from './types'

export interface TargetRepoProfile {
  owner: string
  packageManager: 'npm' | 'pnpm'
  iconsPackage: string
}

export const targetRepoProfiles: Record<TdesignRepo, TargetRepoProfile> = {
  'tdesign-vue': {
    owner: 'Tencent',
    packageManager: 'npm',
    iconsPackage: 'tdesign-icons-vue',
  },
  'tdesign-vue-next': {
    owner: 'Tencent',
    packageManager: 'pnpm',
    iconsPackage: 'tdesign-icons-vue-next',
  },
  'tdesign-react': {
    owner: 'Tencent',
    packageManager: 'pnpm',
    iconsPackage: 'tdesign-icons-react',
  },
  'tdesign-mobile-vue': {
    owner: 'Tencent',
    packageManager: 'npm',
    iconsPackage: 'tdesign-icons-vue-next',
  },
  'tdesign-mobile-react': {
    owner: 'Tencent',
    packageManager: 'npm',
    iconsPackage: 'tdesign-icons-react',
  },
  'tdesign-miniprogram': {
    owner: 'Tencent',
    packageManager: 'pnpm',
    iconsPackage: 'cdn-iconfont',
  },
}

export const prCommands: Record<AutoPrTrigger, { targetRepo: TdesignRepo }> = {
  '/pr-vue': { targetRepo: 'tdesign-vue' },
  '/pr-vue-next': { targetRepo: 'tdesign-vue-next' },
  '/pr-react': { targetRepo: 'tdesign-react' },
  '/pr-mobile-vue': { targetRepo: 'tdesign-mobile-vue' },
  '/pr-mobile-react': { targetRepo: 'tdesign-mobile-react' },
  '/pr-miniprogram': { targetRepo: 'tdesign-miniprogram' },
}

export const repoScopedTriggers = new Set<string>([...Object.keys(prCommands), '/update-common', '/update-snapshot', '/update-coverage'])
