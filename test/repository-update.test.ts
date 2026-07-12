import type { OperationContext, TriggerOperation } from '../src/operations'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as actionsExec from '@actions/exec'
import { describe, expect, it, vi } from 'vitest'
import { getRepositoryOperations, REPOSITORY_ADAPTERS } from '../src/config/repository-adapters'
import { pushChanges, resolveConflictStrategies, setupNode } from '../src/operations'
import { createOperationEnvironments, runOperations } from '../src/tdesign/repository-update'
import { parseTrigger, REPOSITORY_TRIGGERS, tryParseTrigger } from '../src/utils/trigger'
import { isWhitelisted, loadWhitelist } from '../src/utils/whitelist'

vi.mock('@actions/exec', async (importOriginal) => {
  const original = await importOriginal<typeof import('@actions/exec')>()
  return {
    ...original,
    exec: vi.fn(original.exec),
    getExecOutput: vi.fn(original.getExecOutput),
  }
})

function operationNames(repo: string, trigger: Parameters<typeof getRepositoryOperations>[1]): string[] {
  return getRepositoryOperations(repo, trigger)?.map(operation => operation.name) || []
}

describe('repository operation adapter', () => {
  it('parses the command from the first token', () => {
    expect(parseTrigger('  /update-snapshot\nadditional text')).toBe('/update-snapshot')
    expect(parseTrigger('/pr-react please')).toBe('/pr-react')
  })

  it('rejects unsupported configured commands and skips normal comments', () => {
    expect(() => parseTrigger('/unknown')).toThrow('未支持的触发器')
    expect(() => parseTrigger('')).toThrow('未支持的触发器')
    expect(tryParseTrigger('normal PR comment')).toBeUndefined()
  })

  it('registers operation pipelines for every component repository', () => {
    expect(Object.keys(REPOSITORY_ADAPTERS)).toEqual([
      'tdesign-api',
      'tdesign-vue',
      'tdesign-vue-next',
      'tdesign-react',
      'tdesign-mobile-vue',
      'tdesign-mobile-react',
      'tdesign-miniprogram',
    ])
    for (const repo of Object.keys(REPOSITORY_ADAPTERS).filter(repo => repo !== 'tdesign-api')) {
      expect(getRepositoryOperations(repo, '/update-common')).not.toHaveLength(0)
      expect(getRepositoryOperations(repo, '/update-snapshot')).not.toHaveLength(0)
    }
    expect(getRepositoryOperations('tdesign-vue', '/update-ai-core')).toBeUndefined()
  })

  it('keeps repository-specific operation order', () => {
    expect(operationNames('tdesign-vue', '/update-common')).toEqual([
      '更新子模块 src/_common',
      '提交变更: chore: update common',
      '合并 develop',
      '推送 PR 分支',
    ])
    expect(operationNames('tdesign-react', '/update-snapshot')).toEqual([
      '添加运行状态评论',
      '合并 develop',
      '设置 Node.js 工具链',
      '启用 Corepack',
      '使用 pnpm 安装依赖',
      '运行 test:update',
      '提交变更: chore: update snapshot',
      '推送 PR 分支',
    ])
    expect(operationNames('tdesign-miniprogram', '/update-snapshot')).not.toContain('合并 develop')
    expect(operationNames('tdesign-api', '/resolve-conflict')).toEqual([
      '合并 main',
      '设置 Node.js 工具链',
      '启用 Corepack',
      '重新生成并上传 API 数据',
      '提交变更: chore: resolve conflict',
      '推送 PR 分支',
    ])
  })

  it('registers only named operations from known triggers', () => {
    for (const adapter of Object.values(REPOSITORY_ADAPTERS)) {
      for (const [trigger, operations] of Object.entries(adapter)) {
        expect(REPOSITORY_TRIGGERS).toContain(trigger)
        expect(operations.length).toBeGreaterThan(0)
        expect(operations.every(operation => operation.name.length > 0)).toBe(true)
      }
    }
  })

  it('runs operations serially and stops after a failure', async () => {
    const calls: string[] = []
    const operations: TriggerOperation[] = [
      { name: 'first', run: vi.fn(async () => { calls.push('first') }) },
      { name: 'failed', run: vi.fn(async () => { throw new Error('failed') }) },
      { name: 'last', run: vi.fn(async () => { calls.push('last') }) },
    ]

    await expect(runOperations(operations, {} as OperationContext)).rejects.toThrow('failed')
    expect(calls).toEqual(['first'])
  })

  it('isolates git credentials from repository scripts', () => {
    const { env, gitEnv } = createOperationEnvironments('secret', {
      GITHUB_TOKEN: 'github-secret',
      INPUT_TOKEN: 'input-secret',
      PATH: '/bin',
    })

    expect(gitEnv.GH_TOKEN).toBe('secret')
    expect(env).toMatchObject({ HUSKY: '0', PATH: '/bin' })
    expect(env.GH_TOKEN).toBeUndefined()
    expect(env.GITHUB_TOKEN).toBeUndefined()
    expect(env.INPUT_TOKEN).toBeUndefined()
  })

  it('selects the Node.js version declared by the repository', async () => {
    const root = mkdtempSync(join(tmpdir(), 'tdesign-toolchain-test-'))
    const repository = join(root, 'repository')
    const toolCache = join(root, 'tool-cache')
    const architecture = process.arch === 'arm64' ? 'arm64' : 'x64'
    const nodeBin = join(toolCache, 'node', '22.14.0', architecture, 'bin')
    mkdirSync(repository)
    mkdirSync(nodeBin, { recursive: true })
    writeFileSync(join(repository, '.node-version'), '22\n')
    writeFileSync(join(nodeBin, 'node'), '')
    const previousToolCache = process.env.RUNNER_TOOL_CACHE
    process.env.RUNNER_TOOL_CACHE = toolCache

    try {
      const context = { cwd: repository, env: { PATH: '/bin' } } as unknown as OperationContext
      await setupNode().run(context)
      expect(context.env.PATH).toBe(`${nodeBin}:/bin`)
    }
    finally {
      if (previousToolCache) {
        process.env.RUNNER_TOOL_CACHE = previousToolCache
      }
      else {
        delete process.env.RUNNER_TOOL_CACHE
      }
      rmSync(root, { recursive: true })
    }
  })

  it('stops after an operation marks the pipeline as complete', async () => {
    const calls: string[] = []
    const context = { skipRemaining: false } as OperationContext
    const operations: TriggerOperation[] = [
      {
        name: 'skip',
        async run(operationContext) {
          calls.push('skip')
          operationContext.skipRemaining = true
        },
      },
      { name: 'last', run: vi.fn(async () => { calls.push('last') }) },
    ]

    await runOperations(operations, context)
    expect(calls).toEqual(['skip'])
  })

  it('matches exact paths and glob patterns', () => {
    const rules = [
      { pattern: 'packages/common', strategy: 'theirs' as const },
      { pattern: 'test/**/*.snap', strategy: 'ours' as const },
    ]
    const strategies = resolveConflictStrategies([
      'packages/common',
      'test/button.snap',
      'test/unit/__snapshots__/button.snap',
      'src/index.ts',
    ], rules)

    expect(Object.fromEntries(strategies)).toEqual({
      'packages/common': 'theirs',
      'test/button.snap': 'ours',
      'test/unit/__snapshots__/button.snap': 'ours',
    })
  })

  it('pushes to the configured repository without using local hooks or credential helpers', async () => {
    const exec = vi.mocked(actionsExec.exec).mockResolvedValueOnce(0)
    vi.mocked(actionsExec.getExecOutput).mockResolvedValueOnce({
      exitCode: 0,
      stderr: '',
      stdout: 'https://github.com/Tencent/tdesign-vue.git\n',
    })
    const context = {
      cwd: '/tmp/repository',
      dryRun: false,
      gitEnv: { GH_TOKEN: 'secret' },
      headRef: 'feature/test',
      owner: 'Tencent',
      repo: 'tdesign-vue',
    } as unknown as OperationContext

    await pushChanges().run(context)

    expect(exec).toHaveBeenCalledWith('git', [
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'protocol.ext.allow=never',
      '-c',
      'credential.helper=',
      '-c',
      'credential.helper=!gh auth git-credential',
      'push',
      'https://github.com/Tencent/tdesign-vue.git',
      'HEAD:refs/heads/feature/test',
    ], {
      cwd: '/tmp/repository',
      env: { GH_TOKEN: 'secret' },
    })
  })

  it('rejects a push URL rewritten by repository git config', async () => {
    vi.mocked(actionsExec.getExecOutput).mockResolvedValueOnce({
      exitCode: 0,
      stderr: '',
      stdout: 'https://attacker.example/repository.git\n',
    })
    const context = {
      cwd: '/tmp/repository',
      dryRun: false,
      gitEnv: { GH_TOKEN: 'secret' },
      headRef: 'feature/test',
      owner: 'Tencent',
      repo: 'tdesign-vue',
    } as unknown as OperationContext

    await expect(pushChanges().run(context)).rejects.toThrow('Git 推送地址被重写')
  })

  it('checks exact whitelist entries', () => {
    expect(isWhitelisted('alice\nbob\n', 'bob')).toBe(true)
    expect(isWhitelisted('alice\nbobby\n', 'bob')).toBe(false)
    expect(loadWhitelist()).toContain('liweijie0812')
  })
})
