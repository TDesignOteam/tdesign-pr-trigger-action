import { info } from '@actions/core'
import { addContributor, cloneRepo, getPkgLatestVersion, getPrData, updateIcons } from '../utils'
import { iconsMap, ownerMap, repoMap, type TriggerContext } from './trigger'

export default async function start(context: TriggerContext) {
  const prData = await getPrData(context.owner, context.repo, context.pr_number, context.token)
  const body = addContributor(prData.body || '', prData.user.login)
  info(`body:${body}`)
  const packageName = iconsMap[context.comment]
  cloneRepo(ownerMap[context.comment], repoMap[context.comment], context.token)
  updateIcons(repoMap[context.comment])
  const latestVersion = await getPkgLatestVersion(packageName)
  const title = `chore(Icon): update to ${latestVersion}`
  info(title)
};
