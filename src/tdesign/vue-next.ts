import type { RepositoryAdapter } from '../operations'
import { addProgressComment, commitChanges, enableCorepack, installDependencies, mergeBranch, pushChanges, runPackageScript, setupNode, updateSubmodule } from '../operations'

export const vueNextAdapter: RepositoryAdapter = {
  '/update-common': [
    updateSubmodule('packages/common'),
    commitChanges('chore: update common'),
    mergeBranch('develop', [
      { pattern: 'packages/common', strategy: 'ours' },
    ]),
    pushChanges(),
  ],
  '/update-snapshot': [
    addProgressComment('快照更新'),
    mergeBranch('develop', [
      { pattern: '**/csr.test.ts.snap', strategy: 'theirs' },
      { pattern: '**/ssr.test.ts.snap', strategy: 'theirs' },
      { pattern: 'packages/common', strategy: 'theirs' },
    ]),
    setupNode(),
    enableCorepack(),
    installDependencies('pnpm'),
    runPackageScript('pnpm', 'test:update', { recursive: true }),
    commitChanges('chore: update snapshot'),
    pushChanges(),
  ],
  '/update-coverage': [
    addProgressComment('coverage badge 更新'),
    setupNode(),
    enableCorepack(),
    installDependencies('pnpm'),
    runPackageScript('pnpm', 'generate:coverage-badge', { recursive: true }),
    commitChanges('chore: update coverage badge'),
    pushChanges(),
  ],
}
