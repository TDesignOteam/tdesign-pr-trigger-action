import type { TriggerContext } from '../commands/types'
import type { RepoCommandConfig } from './operations/repo-config'
import { createIconsPkgUpdatePr } from './operations/update-icons-pkg'

export const repoConfig: RepoCommandConfig = {
  targetRepo: 'tdesign-flutter',
  iconsPackage: 'tdesign_flutter_icons',
  iconsVersionFile: 'packages/flutter/pubspec.yaml',
  iconsChangelogFile: 'packages/flutter/CHANGELOG.md',
  pubspecPath: 'tdesign-component/pubspec.yaml',
}

export const updateIconsAndCreatePr = (context: TriggerContext) => createIconsPkgUpdatePr(context, repoConfig)
