import { getOctokit } from '@actions/github'

export interface GithubContext {
  owner: string
  repo: string
  token: string
}
export default function useGithub(context: GithubContext) {
  const octokit = getOctokit(context.token)

  async function getPrData(pr_number: number) {
    const { data } = await octokit.rest.pulls.get({
      owner: context.owner,
      repo: context.repo,
      pull_number: pr_number,
    })
    return data
  }

  async function createPR(title: string, head: string, body: string, base?: string) {
    const { data } = await octokit.rest.pulls.create({
      owner: context.owner,
      repo: context.repo,
      title,
      head,
      base: base || 'develop',
      body,
    })
    return data
  }
  async function addComment(pr_number: number, body: string) {
    const { data } = await octokit.rest.issues.createComment({
      owner: context.owner,
      repo: context.repo,
      issue_number: pr_number,
      body,
    })
    return data
  }

  async function getReviewers(pr_number: number) {
    const { data } = await octokit.rest.pulls.listRequestedReviewers({
      owner: context.owner,
      repo: context.repo,
      pull_number: pr_number,
    })
    return { users: data.users.map(item => item.login), teams: data.teams.map(item => item.slug) }
  }

  async function addReviewers(pr_number: number, reviewers: string[], team_reviewers: string[]) {
    const { users, teams } = await getReviewers(pr_number)
    const { data } = await octokit.rest.pulls.requestReviewers({
      owner: context.owner,
      repo: context.repo,
      pull_number: pr_number,
      reviewers: users.concat(reviewers),
      team_reviewers: teams.concat(team_reviewers),
    })
    return data
  }

  return {
    getPrData,
    createPR,
    addComment,
    addReviewers,
  }
}
