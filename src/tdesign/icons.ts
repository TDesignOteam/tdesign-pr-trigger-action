import type { TriggerContext } from './trigger'
import { info } from '@actions/core'
import { addContributor, getPrData } from '../utils'

const vuePackageUrl = 'https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue/package.json'
const vueNextPackageUrl = 'https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/vue-next/package.json'
const reactPackageUrl = 'https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/react/package.json'
const viewPackageUrl = 'https://raw.githubusercontent.com/Tencent/tdesign-icons/refs/heads/develop/packages/view/package.json'

export default async function start(context: TriggerContext) {
  const pr_data = await getPrData(context.owner, context.repo, context.pr_number, context.token)
  const body = addContributor(pr_data.body || '', 'tdesign-helper')

  info(`body:${body}`)
};

function _vue() {
  info(viewPackageUrl)
  info(vuePackageUrl)
}
function _vueNext() {
  info(vueNextPackageUrl)
}
function _react() {
  info(reactPackageUrl)
}
function _mobileVue() {
  info(vueNextPackageUrl)
}
function _mobileReact() {
  info(reactPackageUrl)
}
