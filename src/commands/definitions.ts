import type { AutoPrTrigger, TdesignRepo } from './types'

export interface TargetRepoProfile {
  owner: string
  packageManager: 'npm' | 'pnpm'
}

export const targetRepoProfiles: Record<TdesignRepo, TargetRepoProfile> = {
  'tdesign-vue': {
    owner: 'Tencent',
    packageManager: 'npm',
  },
  'tdesign-vue-next': {
    owner: 'Tencent',
    packageManager: 'pnpm',
  },
  'tdesign-react': {
    owner: 'Tencent',
    packageManager: 'pnpm',
  },
  'tdesign-mobile-vue': {
    owner: 'Tencent',
    packageManager: 'npm',
  },
  'tdesign-mobile-react': {
    owner: 'Tencent',
    packageManager: 'npm',
  },
  'tdesign-miniprogram': {
    owner: 'Tencent',
    packageManager: 'pnpm',
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

export const repoScopedTriggers = new Set<string>([
  ...Object.keys(prCommands),
  '/update-common',
  '/update-snapshot',
  '/update-coverage',
])
