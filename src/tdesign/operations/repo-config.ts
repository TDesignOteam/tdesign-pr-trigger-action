import type { TdesignRepo } from '../../commands/types'

export interface RepoCommandConfig {
  targetRepo: TdesignRepo
  commonSubmodule?: string
  iconsPackage?: string
  siteDeps?: string[]
  snapshotConflictFiles?: string[]
  snapshotScript?: string
  coverageScript?: string
  runApiCss?: boolean
}
