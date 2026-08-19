import type { GithubHelper } from '../utils/github-helper'
import type { RepositoryTrigger } from '../utils/trigger'

export type ConflictStrategy = 'ours' | 'theirs'

export interface ConflictRule {
  pattern: string
  strategy: ConflictStrategy
}

export interface OperationContext {
  cwd: string
  dryRun: boolean
  env: Record<string, string>
  gitEnv: Record<string, string>
  github: GithubHelper
  headRef: string
  owner: string
  prNumber: number
  repo: string
  skipRemaining: boolean
  trigger: RepositoryTrigger
}

export interface TriggerOperation {
  name: string
  run: (context: OperationContext) => Promise<void>
}

export type RepositoryAdapter = Partial<Record<RepositoryTrigger, TriggerOperation[]>>
