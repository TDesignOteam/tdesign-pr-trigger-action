import type { CommandHandler } from '../types'
import { error, getInput, info } from '@actions/core'
import { getClient } from 'node-cnb'

export const deleteCnbBranch: CommandHandler = async (context) => {
  const branch = getInput('branch', { required: true })
  const client = getClient('https://api.cnb.cool', context.token)
  if (!client) {
    error('token 无效')
  }
  try {
    const res = await client.repo.git.branches.delete({ repo: context.repo, branch })
    info(`删除分支成功:${JSON.stringify(res)}`)
  }
  catch (err: any) {
    throw new Error(`删除分支失败: ${JSON.stringify(err.response?.data) || err.message}`)
  }
}
