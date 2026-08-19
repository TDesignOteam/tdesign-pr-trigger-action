import type { RepositoryAdapter } from '../operations'
import { addProgressComment, commitChanges, installDependencies, mergeBranch, pushChanges, runPackageScript, setupNode, updateSubmodule } from '../operations'

export const vueAdapter: RepositoryAdapter = {
  '/update-common': [
    updateSubmodule('src/_common'),
    commitChanges('chore: update common'),
    mergeBranch('develop', [
      { pattern: 'src/_common', strategy: 'ours' },
    ]),
    pushChanges(),
  ],
  '/update-snapshot': [
    addProgressComment('快照更新'),
    mergeBranch('develop', [
      { pattern: '**/csr.test.js.snap', strategy: 'theirs' },
      { pattern: '**/ssr.test.js.snap', strategy: 'theirs' },
      { pattern: 'src/_common', strategy: 'theirs' },
    ]),
    setupNode(),
    installDependencies('npm'),
    runPackageScript('npm', 'test:update'),
    commitChanges('chore: update snapshot'),
    pushChanges(),
  ],
  '/update-coverage': [
    addProgressComment('coverage badge 更新'),
    setupNode(),
    installDependencies('npm'),
    runPackageScript('npm', 'generate:coverage-badge'),
    commitChanges('chore: update coverage badge'),
    pushChanges(),
  ],
}
