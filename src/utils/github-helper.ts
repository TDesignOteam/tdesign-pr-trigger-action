import { endGroup, info, startGroup } from '@actions/core'
import { getOctokit } from '@actions/github'

export interface GithubContext {
  owner: string
  repo: string
  token: string
  dryRun: boolean
}
export class GithubHelper {
  private octokit: ReturnType<typeof getOctokit>
  private context: GithubContext
  private dryRun: boolean

  constructor(context: GithubContext) {
    this.context = context
    this.dryRun = context.dryRun
    this.octokit = getOctokit(context.token)
  }

  private isDryRun(): boolean {
    return this.dryRun
  }

  private logDryRunInfo(action: string, details?: Record<string, unknown>): void {
    if (this.isDryRun()) {
      const message = details ? `${action}: ${JSON.stringify(details)}` : action
      info(`[DRY-RUN] ${message}`)
    }
  }

  async getPrData(pr_number: number) {
    const { data } = await this.octokit.rest.pulls.get({
      owner: this.context.owner,
      repo: this.context.repo,
      pull_number: pr_number,
    })
    return data
  }

  async createPR(title: string, head: string, body: string, base?: string) {
    if (this.isDryRun()) {
      startGroup('dry-run模式, 不运行createPR')
      this.logDryRunInfo('createPR', { title, head, base, body })
      endGroup()
      return
    }
    const { data } = await this.octokit.rest.pulls.create({
      owner: this.context.owner,
      repo: this.context.repo,
      title,
      head,
      base: base || 'develop',
      body,
    })
    return data
  }

  async addComment(pr_number: number, body: string) {
    if (this.isDryRun()) {
      startGroup('dry-run模式, 不运行addComment')
      this.logDryRunInfo('addComment', { pr_number, body })
      endGroup()
      return
    }
    const { data } = await this.octokit.rest.issues.createComment({
      owner: this.context.owner,
      repo: this.context.repo,
      issue_number: pr_number,
      body,
    })
    return data
  }

  async addLabels(pr_number: number, labels: string[]) {
    if (this.isDryRun()) {
      startGroup('dry-run模式, 不运行addLabels')
      this.logDryRunInfo('addLabels', { pr_number, labels })
      endGroup()
      return
    }
    const { data } = await this.octokit.rest.issues.addLabels({
      owner: this.context.owner,
      repo: this.context.repo,
      issue_number: pr_number,
      labels,
    })
    return data
  }
}
