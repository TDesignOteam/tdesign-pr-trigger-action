import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { GitHelper } from '../src/utils/git-helper'

const directories: string[] = []

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

function git(cwd: string, ...args: string[]) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  }).trim()
}

function initRepo(path: string) {
  mkdirSync(path)
  git(path, 'init', '-b', 'base')
  git(path, 'config', 'user.name', 'test')
  git(path, 'config', 'user.email', 'test@example.com')
  git(path, 'config', 'commit.gpgsign', 'false')
}

describe('gitHelper.mergeWithStrategy', () => {
  it.each(['ours', 'theirs'] as const)('保留 %s 子模块指针并同步工作目录', async (strategy) => {
    const root = mkdtempSync(join(tmpdir(), 'pr-trigger-git-'))
    directories.push(root)
    const source = join(root, 'source')
    const repo = join(root, 'parent')
    initRepo(source)
    writeFileSync(join(source, 'file'), 'base')
    git(source, 'add', '.')
    git(source, 'commit', '-m', 'base')
    const base = git(source, 'rev-parse', 'HEAD')
    const versions = { ours: '', theirs: '' }
    for (const branch of ['ours', 'theirs'] as const) {
      git(source, 'checkout', '-b', branch, base)
      writeFileSync(join(source, 'file'), branch)
      git(source, 'commit', '-am', branch)
      versions[branch] = git(source, 'rev-parse', 'HEAD')
    }

    initRepo(repo)
    git(repo, '-c', 'protocol.file.allow=always', 'submodule', 'add', source, 'common')
    const submodule = join(repo, 'common')
    git(submodule, 'checkout', base)
    git(repo, 'add', '.')
    git(repo, 'commit', '-m', 'base')
    for (const branch of ['ours', 'theirs'] as const) {
      git(repo, 'checkout', '-b', branch, 'base')
      git(submodule, 'checkout', versions[branch])
      git(repo, 'add', '.')
      git(repo, 'commit', '-m', branch)
    }
    git(repo, 'checkout', 'ours')
    git(submodule, 'checkout', versions.ours)

    const helper = new GitHelper({
      owner: 'test',
      repo: relative(process.cwd(), repo),
      token: '',
      dryRun: true,
    })
    await helper.mergeWithStrategy('theirs', { submodule: strategy })

    expect(git(repo, 'rev-parse', 'HEAD:common')).toBe(versions[strategy])
    expect(git(submodule, 'rev-parse', 'HEAD')).toBe(versions[strategy])
    expect(git(repo, 'status', '--porcelain')).toBe('')
    expect(git(repo, 'rev-list', '--parents', '-n', '1', 'HEAD').split(' ')).toHaveLength(3)
  })
})
