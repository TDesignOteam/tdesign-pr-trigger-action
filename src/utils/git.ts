import { exec, getExecOutput } from '@actions/exec'

export interface GitContext {
  owner: string
  repo: string
  token: string
}
export default function useGit(context: GitContext) {
  async function cloneRepo(branchName = 'develop') {
    // const repo_url = `https://${context.token}@github.com/${context.owner}/${context.repo}.git`
    const repo_url = `git@github.com:${context.owner}}/${context.repo}.git`
    await exec('git', ['clone', '-b', branchName, repo_url, `../${context.repo}`])
  }
  async function createBranch(branch: string) {
    await exec('git', ['checkout', '-b', branch], { cwd: `../${context.repo}` })
  }

  async function checkoutBranch(branch: string) {
    await exec('git', ['checkout', branch], { cwd: `../${context.repo}` })
  }
  async function checkoutPr(pr_number: number) {
    await exec('git', ['fetch', 'origin', `pull/${pr_number}/head:pr-${pr_number}`], { cwd: `../${context.repo}` })
    await exec('git', ['checkout', `pr-${pr_number}`], { cwd: `../${context.repo}` })
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
  async function addRemote(origin: string, gitUrl: string) {
    await exec('git', ['remote', 'add', origin, gitUrl], { cwd: `../${context.repo}` })
    await exec('git', ['fetch', origin], { cwd: `../${context.repo}` })
  }

  return {
    checkoutPr,
    cloneRepo,
    createBranch,
    gitCommit,
    gitPush,
    initSubmodule,
    updateSubmodule,
    isNeedCommit,
    checkoutBranch,
    addRemote,
  }
}
