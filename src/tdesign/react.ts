import type { RepositoryAdapter, TriggerOperation } from '../operations'
import { addProgressComment, commitChanges, enableCorepack, installDependencies, mergeBranch, pushChanges, runPackageScript, setupNode, updateSubmodule } from '../operations'

function updateSnapshot(): TriggerOperation[] {
  return [
    setupNode(),
    enableCorepack(),
    installDependencies('pnpm'),
    runPackageScript('pnpm', 'test:update'),
  ]
}

function updateCoverage(): TriggerOperation[] {
  return [
    setupNode(),
    enableCorepack(),
    installDependencies('pnpm'),
    runPackageScript('pnpm', 'generate:coverage-badge'),
  ]
}

export const reactAdapter: RepositoryAdapter = {
  '/update-common': [
    updateSubmodule('packages/common'),
    commitChanges('chore: update common'),
    mergeBranch('develop', [
      { pattern: 'packages/common', strategy: 'ours' },
      { pattern: 'packages/ai-core', strategy: 'theirs' },
    ]),
    pushChanges(),
  ],
  '/update-ai-core': [
    updateSubmodule('packages/ai-core'),
    commitChanges('chore: update ai-core'),
    mergeBranch('develop', [
      { pattern: 'packages/common', strategy: 'theirs' },
      { pattern: 'packages/ai-core', strategy: 'ours' },
    ]),
    pushChanges(),
  ],
  '/update-snapshot': [
    addProgressComment('快照更新'),
    mergeBranch('develop', [
      { pattern: '**/csr.test.jsx.snap', strategy: 'theirs' },
      { pattern: '**/ssr.test.jsx.snap', strategy: 'theirs' },
      { pattern: 'packages/common', strategy: 'theirs' },
      { pattern: 'packages/ai-core', strategy: 'theirs' },
    ]),
    ...updateSnapshot(),
    commitChanges('chore: update snapshot'),
    pushChanges(),
  ],
  '/update-coverage': [
    addProgressComment('coverage badge 更新'),
    ...updateCoverage(),
    commitChanges('chore: update coverage badge'),
    pushChanges(),
  ],
}
