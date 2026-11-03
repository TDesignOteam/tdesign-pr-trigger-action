import type { TdesignRepo } from '../../commands/types'

export interface RepoCommandConfig {
  targetRepo: TdesignRepo
  commonSubmodule?: string
  iconsPackage?: string
  iconsVersionFile?: string
  iconsChangelogFile?: string
  pubspecPath?: string
  siteDeps?: string[]
  snapshotConflictFiles?: string[]
  snapshotScript?: string
  coverageScript?: string | string[]
  recursiveScripts?: boolean
  runApiCss?: boolean
}
