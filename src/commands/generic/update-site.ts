import type { CommandHandler } from '../types'
import { info } from '@actions/core'
import { getExecOutput } from '@actions/exec'
import { GitHelper, GithubHelper } from '../../utils'

export const updateSite: CommandHandler = async (context) => {
  const gitHelper = new GitHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })

  try {
    await gitHelper.clone()
    await gitHelper.checkout('main')
    await gitHelper.fetch()
    const { stdout } = await getExecOutput('git', ['rev-parse', 'HEAD'], { cwd: `./${context.repo}` })
    const baseSha = stdout.trim()
    const mergeResult = await gitHelper.merge('origin/develop')
    if (mergeResult.includes('Already up to date')) {
      info('develop 无新提交')
      await githubHelper.addComment(context.pr_number, '> /update-site\r\n \r\n develop 无新提交，官网已是最新')
      return
    }
    await gitHelper.push('main')
    await githubHelper.addComment(context.pr_number, `> /update-site\r\n \r\n 官网更新成功，请查看 https://github.com/${context.owner}/${context.repo}/compare/${baseSha}...main`)
  }
  catch (err: any) {
    await githubHelper.addComment(context.pr_number, `> /update-site\r\n \r\n 官网更新失败: ${err.message}`)
    throw err
  }
}
