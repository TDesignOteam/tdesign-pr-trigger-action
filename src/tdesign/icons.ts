import type { CreatePRContext } from '../utils'
import { endGroup, info, startGroup } from '@actions/core'
import { addContributor, bumpIconsVersion, cloneRepo, createBranch, createPR, getPkgLatestVersion, getPrData, gitCommit, gitPush } from '../utils'
import { iconsMap, ownerMap, repoMap, type TriggerContext } from './trigger'

export default async function start(context: TriggerContext) {
  const prData = await getPrData(context.owner, context.repo, context.pr_number, context.token)
  const body = addContributor(prData.body || '', prData.user.login)
  startGroup('body')
  info(`${body}`)
  endGroup()
  const packageName = iconsMap[context.comment]
  startGroup(packageName)
  const latestVersion = await getPkgLatestVersion(packageName)
  info(`latestVersion: ${latestVersion}`)
  endGroup()
  await cloneRepo(ownerMap[context.comment], repoMap[context.comment], context.token)
  const branchName = await createBranch(repoMap[context.comment], `chore/update-${packageName}/pr${context.pr_number}`)
  await bumpIconsVersion(repoMap[context.comment])

  await gitCommit(repoMap[context.comment], `chore: update ${packageName} to ${latestVersion}`)
  await gitPush(repoMap[context.comment], branchName)

  const title = `feat(Icon): ${packageName} update to ${latestVersion}`
  const prContext: CreatePRContext = {
    owner: ownerMap[context.comment],
    repo: repoMap[context.comment],
    title,
    head: `chore/update-${packageName}/pr${context.pr_number}`,
    body,
    token: context.token,
  }
  createPR(prContext)

  info(title)
};
