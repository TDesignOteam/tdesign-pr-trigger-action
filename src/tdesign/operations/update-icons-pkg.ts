import type { TriggerContext } from '../../commands/types'
import type { RepoCommandConfig } from './repo-config'
import { endGroup, info, startGroup } from '@actions/core'
import { targetRepoProfiles } from '../../commands/definitions'
import { adaptChangelogForRepo, addContributor, buildPrBody, bumpPackageDeps, bumpPubDependency, changelogSectionToEntries, corepackEnable, getChangelogFromRepo, getPkgVersionFromRepo, getPrTemplateFromRepo, GitHelper, GithubHelper } from '../../utils'

export async function createIconsPkgUpdatePr(context: TriggerContext, config: RepoCommandConfig) {
  const githubHelper = new GithubHelper({
    repo: context.repo,
    owner: context.owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const prData = await githubHelper.getPrData(context.pr_number)
  if (!prData.merged) {
    info('pr has been merged')
    githubHelper.addComment(context.pr_number, 'PR 还没合并，无法触发')
    return
  }
  const link = `([icons#${context.pr_number}](https://github.com/Tencent/tdesign-icons/pull/${context.pr_number}))`
  const targetRepo = config.targetRepo
  const { owner, packageManager } = targetRepoProfiles[targetRepo]
  const packageName = config.iconsPackage
  if (!packageName) {
    throw new Error(`${targetRepo} 未配置 iconsPackage`)
  }
  const versionFile = config.iconsVersionFile
  if (!versionFile) {
    throw new Error(`${targetRepo} 未配置 iconsVersionFile`)
  }
  startGroup(packageName)
  // /pr 指令在 PR 合并后才会评论，develop 分支的版本号即本次变更的版本
  const latestVersion = await getPkgVersionFromRepo(context.owner, context.repo, versionFile)
  info(`latestVersion: ${latestVersion}`)
  endGroup()
  if (!latestVersion) {
    throw new Error(`未从 ${versionFile} 获取到版本号`)
  }

  // 发布 PR 的描述不再携带日志，改从对应包的 CHANGELOG.md 按版本号提取，填入目标仓库 PR 模板
  let body = ''
  if (config.iconsChangelogFile) {
    const section = await getChangelogFromRepo(context.owner, context.repo, config.iconsChangelogFile, latestVersion)
    const attribution = ` @${prData.user.login} ([icons #${context.pr_number}](https://github.com/Tencent/tdesign-icons/pull/${context.pr_number}))`
    const entries = changelogSectionToEntries(section, 'Icon', attribution)
    if (entries.length > 0) {
      const template = await getPrTemplateFromRepo(owner, targetRepo)
      body = buildPrBody(template, entries, config.iconsChangelogSections ?? [targetRepo])
    }
  }
  if (!body) {
    body = adaptChangelogForRepo(addContributor(prData.body || '', prData.user.login, link), targetRepo)
  }
  startGroup('body')
  info(`${body}`)
  endGroup()

  const gitHelper = new GitHelper({
    repo: targetRepo,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const baseBranch = await gitHelper.clone()
  const branchName = `chore/icon/${packageName}/${latestVersion}`
  await gitHelper.createBranch(branchName)

  if (packageManager === 'pub') {
    const pubspecPath = config.pubspecPath
    if (!pubspecPath) {
      throw new Error(`${targetRepo} 未配置 pubspecPath`)
    }
    await bumpPubDependency(targetRepo, packageName, latestVersion, pubspecPath)
  }
  else {
    await corepackEnable()
    await bumpPackageDeps(targetRepo, [packageName], { [packageName]: latestVersion })
  }

  if (!await gitHelper.isNeedCommit()) {
    githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n \r\n icons 已是最新版本，无需升级`)
    return true
  }
  const title = `feat(Icon): upgrade ${packageName} to ${latestVersion}`
  await gitHelper.commit(title)

  await gitHelper.push(branchName)

  const targetRepoHelper = new GithubHelper({
    repo: targetRepo,
    owner,
    token: context.token,
    dryRun: context.dry_run,
  })
  const newPrData = await targetRepoHelper.createPR(title, branchName, body, baseBranch)
  if (newPrData) {
    githubHelper.addComment(context.pr_number, `> ${context.trigger}\r\n \r\n 创建 PR 成功， 请查看 ${newPrData.html_url}`)
  }
}
