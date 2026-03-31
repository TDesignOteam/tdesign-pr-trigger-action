export type AutoPrTrigger = '/pr-vue' | '/pr-vue-next' | '/pr-react' | '/pr-mobile-vue' | '/pr-mobile-react' | '/pr-miniprogram'

export type Trigger = AutoPrTrigger | '/upgrade-deps' | '/delete-cnb-branch'

export type TdesignRepo = 'tdesign-vue' | 'tdesign-vue-next' | 'tdesign-react' | 'tdesign-mobile-vue' | 'tdesign-mobile-react' | 'tdesign-miniprogram'

export interface RepoMapping {
  icons: string
  repo: TdesignRepo
  owner: string
  packageManager: string
}

export const REPO_MAPPING: Record<AutoPrTrigger, RepoMapping> = {
  '/pr-vue': {
    icons: 'tdesign-icons-vue',
    repo: 'tdesign-vue',
    owner: 'Tencent',
    packageManager: 'npm',
  },
  '/pr-vue-next': {
    icons: 'tdesign-icons-vue-next',
    repo: 'tdesign-vue-next',
    owner: 'Tencent',
    packageManager: 'pnpm',
  },
  '/pr-react': {
    icons: 'tdesign-icons-react',
    repo: 'tdesign-react',
    owner: 'Tencent',
    packageManager: 'pnpm',
  },
  '/pr-mobile-vue': {
    icons: 'tdesign-icons-vue-next',
    repo: 'tdesign-mobile-vue',
    owner: 'Tencent',
    packageManager: 'npm',
  },
  '/pr-mobile-react': {
    icons: 'tdesign-icons-react',
    repo: 'tdesign-mobile-react',
    owner: 'Tencent',
    packageManager: 'npm',
  },
  '/pr-miniprogram': {
    icons: 'cdn-iconfont',
    repo: 'tdesign-miniprogram',
    owner: 'Tencent',
    packageManager: 'pnpm',
  },
}

export function getRepoMapping(trigger: AutoPrTrigger): RepoMapping | undefined {
  return REPO_MAPPING[trigger]
}

export function getIconsPackage(trigger: AutoPrTrigger): string | undefined {
  return REPO_MAPPING[trigger]?.icons
}

export function getTargetRepo(trigger: AutoPrTrigger): TdesignRepo | undefined {
  return REPO_MAPPING[trigger]?.repo
}

export function getOwner(trigger: AutoPrTrigger): string | undefined {
  return REPO_MAPPING[trigger]?.owner
}

export function getPackageManager(repo: TdesignRepo): string | undefined {
  return Object.values(REPO_MAPPING).find(r => r.repo === repo)?.packageManager
}
