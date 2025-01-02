import { info } from 'node:console'
import process from 'node:process'
import { getInput } from '@actions/core'
import { exec } from '@actions/exec'
import { context, getOctokit } from '@actions/github'

export async function run(): Promise<void> {
  const repo = getInput('repo') || context.repo.repo
  const owner = getInput('owner') || context.repo.owner
  const pr_number = getInput('pr_number') || context.issue.number
  const token = process.env.GITHUB_TOKEN || getInput('token')
  const octokit = getOctokit(token)
  const { data: pr_data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pr_number as number,
  })
  //   info('pr_data', pr_data)
  info('pr_data.data', pr_data.body)
  const repo_url = `https://github.com/liweijie0812/tdesign-vue-next.git`
  await exec(`ls -al`)
  await exec(`git clone ${repo_url} ../tdesign-vue-next`)
  await exec(`ls -al ../`)
  await exec(`ls -al`, [], { cwd: `../tdesign-vue-next` })
  await exec(`git config --global user.email "674416404@qq.com"`)
  await exec(`git config --global user.name "lwj"`)
  await exec(`git submodule update --init --remote`, [], { cwd: `../tdesign-vue-next` })
  await exec(`git remote -v`, [], { cwd: `../tdesign-vue-next` })
  await exec(`git status`, [], { cwd: `../tdesign-vue-next` })
  await exec(`git checkout -b chore/update-common/pr${pr_number}`, [], { cwd: `../tdesign-vue-next` })
  await exec(`git commit -am "chore: update common"`, [], { cwd: `../tdesign-vue-next` })
  await exec(`git push origin chore/update-common/pr${pr_number}`, [], { cwd: `../tdesign-vue-next` })
  // await exec(`ls -al`)
//   await exec(`git submodule update --init --remote`)
//   await exec(`git status`)
}
run().catch(console.error)
