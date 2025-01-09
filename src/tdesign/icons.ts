import { endGroup, info, startGroup } from '@actions/core'
import { addContributor, cloneRepo, getPkgLatestVersion, getPrData, updateIcons } from '../utils'
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
  cloneRepo(ownerMap[context.comment], repoMap[context.comment], context.token)
  updateIcons(repoMap[context.comment])

  const title = `chore(Icon): update to ${latestVersion}`
  info(title)
};
