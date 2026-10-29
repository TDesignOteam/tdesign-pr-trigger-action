import type { CommandHandler } from '../types'
import { getInput } from '@actions/core'
import { exec } from '@actions/exec'
import { corepackEnable, getPkgLatestVersion, GitHelper, GithubHelper } from '../../utils'

export const upgradeDeps: CommandHandler = async (context) => {
  const deps = getInput('deps')
  const packageManager = getInput('package-manager') || 'npm'

  if (!deps) {
    throw new Error('请指定需要升级的依赖')
  }
  const latestVersion = await getPkgLatestVersion(deps)

  if (packageManager !== 'npm') {
    await corepackEnable()
  }
  const gitHelper = new GitHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const baseBranch = await gitHelper.clone()
  const branchName = `chore/deps/${deps}/${latestVersion}`
  await gitHelper.createBranch(branchName)
  if (packageManager === 'pnpm') {
    await exec('pnpm', ['--recursive', 'update', deps, '--latest'], { cwd: `./${context.repo}` })
  }
  else {
    await exec('npx', ['npm-check-updates', deps, '-u'], { cwd: `./${context.repo}` })
  }

  if (!await gitHelper.isNeedCommit()) {
    return true
  }

  const title = `chore(deps): upgrade ${deps} to ${latestVersion}`
  await gitHelper.commit(title)
  await gitHelper.push(branchName)

  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const prData = await githubHelper.createPR(title, branchName, title, baseBranch)
  if (prData) {
    await githubHelper.addLabels(prData.number, ['skip-changelog'])
  }
}
