import type { RepositoryAdapter } from '../operations'
import { addProgressComment, commitChanges, enableCorepack, installDependencies, pushChanges, runPackageScript, setupNode, updateSubmodule } from '../operations'

export const miniprogramAdapter: RepositoryAdapter = {
  '/update-common': [
    updateSubmodule('packages/common', { merge: true }),
    commitChanges('chore: update common'),
    pushChanges(),
  ],
  '/update-snapshot': [
    addProgressComment('快照更新'),
    setupNode(),
    enableCorepack(),
    installDependencies('pnpm'),
    runPackageScript('npm', 'test:snap-update'),
    commitChanges('chore: update snapshot'),
    pushChanges(),
  ],
}
