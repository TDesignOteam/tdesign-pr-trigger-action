import { describe, expect, it, vi } from 'vitest'
import react from '../src/tdesign/react'
import useTrigger, { getTargetModule, getTargetModuleByRepo, parseTrigger, parseTriggerArgs } from '../src/utils/trigger'

const context = {
  owner: 'Tencent',
  repo: 'tdesign-common',
  pr_number: 1,
  token: 'token',
  trigger: '/pr-react' as const,
  args: [],
  dry_run: true,
}

describe('trigger routes', () => {
  it('routes /pr-react to the react target module', () => {
    expect(getTargetModule('/pr-react')).toBe(react)
  })

  it('uses the target module update method for the source repository', async () => {
    const propagateCommon = vi.spyOn(react, 'propagateCommon').mockResolvedValue(undefined)

    await getTargetModule('/pr-react').run(context)

    expect(propagateCommon).toHaveBeenCalledWith(context)
    propagateCommon.mockRestore()
  })

  it('rejects unsupported triggers', () => {
    expect(() => parseTrigger('/pr-unknown')).toThrow('未支持的触发器')
  })

  it('parses command arguments', () => {
    expect(parseTrigger('/update-common 123')).toBe('/update-common')
    expect(parseTriggerArgs('/update-common 123')).toEqual(['123'])
  })

  it('routes current PR commands by repository', async () => {
    const updateCommon = vi.spyOn(react, 'updateCommon').mockResolvedValue(undefined)

    const reactContext = { ...context, repo: 'tdesign-react', trigger: '/update-common' as const, args: ['123'] }
    await useTrigger(reactContext)

    expect(updateCommon).toHaveBeenCalledWith(reactContext)
    updateCommon.mockRestore()
  })

  it('rejects update-ai-core outside tdesign-react', async () => {
    await expect(useTrigger({ ...context, repo: 'tdesign-vue', trigger: '/update-ai-core' })).rejects.toThrow('/update-ai-core 不支持仓库')
  })

  it('resolves all supported component repositories', () => {
    expect(getTargetModuleByRepo('tdesign-react')).toBe(react)
    expect(() => getTargetModuleByRepo('tdesign')).toThrow('不支持当前 PR 更新指令')
  })

  it('rejects unsupported source repositories', async () => {
    await expect(getTargetModule('/pr-react').run({ ...context, repo: 'tdesign' })).rejects.toThrow('不支持来源仓库')
  })
})
