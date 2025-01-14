import { exec, getExecOutput } from '@actions/exec'

export interface GitContext {
  owner: string
  repo: string
  token: string
}
export default function useGit(context: GitContext) {
  async function cloneRepo() {
    const repo_url = `https://${context.token}@github.com/${context.owner}/${context.repo}.git`
    await exec('git', ['clone', repo_url, `../${context.repo}`])
  }
  async function createBranch(branch: string) {
    await exec('git', ['checkout', '-b', branch], { cwd: `../${context.repo}` })
  }
  async function gitCommit(message: string) {
    await exec(`git commit -am "${message}" --no-verify`, [], { cwd: `../${context.repo}` })
  }
  async function gitPush(branch: string) {
    await exec(`git push origin ${branch}`, [], { cwd: `../${context.repo}` })
  }

  async function initSubmodule() {
    await exec('git', ['submodule', 'update', '--init', '--recursive'], { cwd: `../${context.repo}` })
  }

  async function updateSubmodule() {
    await exec('git', ['submodule', 'update', '--remote'], { cwd: `../${context.repo}` })
  }

  async function isNeedCommit() {
    const { stdout } = await getExecOutput('git', ['status'], { cwd: `../${context.repo}` })
    return !stdout.includes('nothing to commit, working tree clean')
  }

  return {
    cloneRepo,
    createBranch,
    gitCommit,
    gitPush,
    initSubmodule,
    updateSubmodule,
    isNeedCommit,
  }
}
