export type AutoPrTrigger = '/pr-vue' | '/pr-vue-next' | '/pr-react' | '/pr-mobile-vue' | '/pr-mobile-react' | '/pr-miniprogram' | '/pr-tdesign' | '/update-common' | '/update-snapshot'

export type Trigger = AutoPrTrigger | '/upgrade-deps' | '/delete-cnb-branch'

export type TdesignRepo = 'tdesign-vue' | 'tdesign-vue-next' | 'tdesign-react' | 'tdesign-mobile-vue' | 'tdesign-mobile-react' | 'tdesign-miniprogram' | 'tdesign-tdesign' | 'tdesign-common'

export type TriggerSource = 'common' | 'icons' | 'self'

export interface RepoMapping {
  source: TriggerSource
  targetRepo: TdesignRepo
  owner: string
  packageManager: string
  iconsPackage?: string
}

export const REPO_MAPPING: Record<AutoPrTrigger, RepoMapping> = {
  '/pr-vue': {
    source: 'common',
    targetRepo: 'tdesign-vue',
    owner: 'Tencent',
    packageManager: 'npm',
  },
  '/pr-vue-next': {
    source: 'common',
    targetRepo: 'tdesign-vue-next',
    owner: 'Tencent',
    packageManager: 'pnpm',
  },
  '/pr-react': {
    source: 'common',
    targetRepo: 'tdesign-react',
    owner: 'Tencent',
    packageManager: 'pnpm',
  },
  '/pr-mobile-vue': {
    source: 'common',
    targetRepo: 'tdesign-mobile-vue',
    owner: 'Tencent',
    packageManager: 'npm',
  },
  '/pr-mobile-react': {
    source: 'common',
    targetRepo: 'tdesign-mobile-react',
    owner: 'Tencent',
    packageManager: 'npm',
  },
  '/pr-miniprogram': {
    source: 'common',
    targetRepo: 'tdesign-miniprogram',
    owner: 'Tencent',
    packageManager: 'pnpm',
  },
  '/pr-tdesign': {
    source: 'icons',
    targetRepo: 'tdesign-tdesign',
    owner: 'Tencent',
    packageManager: 'pnpm',
  },
  '/update-common': {
    source: 'self',
    targetRepo: 'tdesign-common',
    owner: 'Tencent',
    packageManager: 'npm',
  },
  '/update-snapshot': {
    source: 'self',
    targetRepo: 'tdesign-common',
    owner: 'Tencent',
    packageManager: 'npm',
  },
}

export const ICONS_MAPPING: Partial<Record<AutoPrTrigger, string>> = {
  '/pr-vue': 'tdesign-icons-vue',
  '/pr-vue-next': 'tdesign-icons-vue-next',
  '/pr-react': 'tdesign-icons-react',
  '/pr-mobile-vue': 'tdesign-icons-vue-next',
  '/pr-mobile-react': 'tdesign-icons-react',
  '/pr-miniprogram': 'cdn-iconfont',
  '/pr-tdesign': 'tdesign-icons',
}

export function getRepoMapping(trigger: AutoPrTrigger): RepoMapping | undefined {
  return REPO_MAPPING[trigger]
}

export function getIconsPackage(trigger: AutoPrTrigger): string | undefined {
  return ICONS_MAPPING[trigger]
}

export function getTargetRepo(trigger: AutoPrTrigger): TdesignRepo | undefined {
  return REPO_MAPPING[trigger]?.targetRepo
}

export function getOwner(trigger: AutoPrTrigger): string | undefined {
  return REPO_MAPPING[trigger]?.owner
}

export function getSource(trigger: AutoPrTrigger): TriggerSource | undefined {
  return REPO_MAPPING[trigger]?.source
}

export function getPackageManager(repo: TdesignRepo): string | undefined {
  return Object.values(REPO_MAPPING).find(r => r.targetRepo === repo)?.packageManager
}
