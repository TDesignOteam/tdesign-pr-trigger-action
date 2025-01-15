import { getOctokit } from '@actions/github'

export interface GithubContext {
  owner: string
  repo: string
  token: string
}
export default function useGithub(context: GithubContext) {
  const octokit = getOctokit(context.token)

  async function getPrData(pr_number: number) {
    const { data: pr_data } = await octokit.rest.pulls.get({
      owner: context.owner,
      repo: context.repo,
      pull_number: pr_number,
    })
    return pr_data
  }

  async function createPR(title: string, head: string, body: string, base?: string) {
    await octokit.rest.pulls.create({
      owner: context.owner,
      repo: context.repo,
      title,
      head,
      base: base || 'develop',
      body,
    })
  }

  return {
    getPrData,
    createPR,
  }
}
