import process from 'node:process'
import { getInput, info } from '@actions/core'

import { context } from '@actions/github'
import { setGitConfig } from './utils'
import useTrigger from './utils/trigger'

export async function run(): Promise<void> {
  const repo = getInput('repo') || context.repo.repo
  const owner = getInput('owner') || context.repo.owner
  const pr_number = getInput('pr_number') || context.issue.number
  const token = process.env.GITHUB_TOKEN || getInput('token')
  const trigger = getInput('trigger') || context.payload.comment?.body || ''

  if (context.eventName === 'issue_comment' && context.payload.pull_request) {
    info('pr comment trigger')
    // TODO 需要白名单的人才能触发
  }
  await setGitConfig()

  useTrigger({
    owner,
    repo,
    pr_number: pr_number as number,
    token,
    trigger,
  })
  // info('comment', comment)
  // const repo_url = `https://${token}@github.com/liweijie0812/tdesign-vue-next.git`
  // await exec(`ls -al`)
  // await exec(`git clone ${repo_url} ../tdesign-vue-next`)
  // await exec(`ls -al ../`)
  // await exec(`ls -al`, [], { cwd: `../tdesign-vue-next` })
  // await exec(`git config --global user.email "github-actions[bot]@users.noreply.github.com""`)
  // await exec(`git config --global user.name "github-actions[bot]"`)
  // await exec(`git submodule update --init --remote`, [], { cwd: `../tdesign-vue-next` })
  // await exec(`git remote -v`, [], { cwd: `../tdesign-vue-next` })
  // await exec(`npm install`, [], { cwd: `../tdesign-vue-next` })
  // await exec(`npm run test:update`, [], { cwd: `../tdesign-vue-next` })
  // await exec(`git status`, [], { cwd: `../tdesign-vue-next` })
  // await exec(`git checkout -b chore/update-common/pr${pr_number}`, [], { cwd: `../tdesign-vue-next` })
  // await exec(`git commit -am "chore: update common"`, [], { cwd: `../tdesign-vue-next` })
  // await exec(`git push origin chore/update-common/pr${pr_number}`, [], { cwd: `../tdesign-vue-next` })

  // await octokit.rest.pulls.create({
  //   owner: 'liweijie0812',
  //   repo: 'tdesign-vue-next',
  //   title: 'chore: update common',
  //   head: `chore/update-common/pr${pr_number}`,
  //   base: 'develop',
  //   body: pr_data.body || '',
  // })
  // await exec(`ls -al`)
//   await exec(`git submodule update --init --remote`)
//   await exec(`git status`)
}
run().catch(console.error)
