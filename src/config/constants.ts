// Changelog related regex patterns
export const SKIP_CHANGELOG_REG = /\[x\] 本条 PR 不需要纳入 Changelog/i
export const CHANGELOG_REG = /-\s([A-Z]+)(?:\(([A-Z\s_-]*)\))?\s*:\s*(.+)/i
export const REMOVE_SKIP_CHANGELOG_REG = /-\s\[ \] 本条 PR 不需要纳入 Changelog\r\n?/gi
export const CHANGELOG_SECTION_REG = /(### 📝 更新日志\r\n)([\r\n]*)(.*)/

// Repository specific constants
export const SUPPORTED_CHANGELOG_REPOS = ['tdesign-vue-next', 'tdesign-react', 'tdesign-miniprogram']
export const WORKSPACE_MANIFEST_REPOS = ['tdesign-vue-next', 'tdesign-miniprogram']
export const CSS_UPDATE_REPOS = ['tdesign-mobile-vue', 'tdesign-mobile-react']

// NPM registry
export const NPM_REGISTRY = 'https://registry.npmjs.org/'

// Branch naming patterns
export const BRANCH_PATTERNS = {
  DEPS: (dep: string, version: string) => `chore/deps/${dep}/${version}`,
  SUBMODULE: (prNumber: number) => `chore/submodule/common-pr-${prNumber}`,
  ICON: (packageName: string, version: string) => `chore/icon/${packageName}/${version}`,
} as const

// PR titles
export const PR_TITLES = {
  DEPS: (dep: string, version: string) => `chore(deps): upgrade ${dep} to ${version}`,
  SUBMODULE: 'chore(submodule): update common',
  ICON: (packageName: string, version: string) => `feat(Icon): upgrade ${packageName} to ${version}`,
  CSS_VARS: 'docs: update css vars',
  SNAPSHOT: 'chore: update snapshot',
} as const

// Labels
export const PR_LABELS = {
  SKIP_CHANGELOG: 'skip-changelog',
} as const

// Git config
export const GIT_CONFIG = {
  USER_NAME: 'tdesign-bot',
  USER_EMAIL: 'tdesign@tencent.com',
} as const

// Default branch
export const DEFAULT_BASE_BRANCH = 'develop'

// Snapshot update script names
export const SNAPSHOT_SCRIPTS = {
  DEFAULT: 'test:update',
  MINIPROGRAM: 'test:snap-update',
} as const
