import type { OperationContext, RepositoryAdapter, TriggerOperation } from '../operations'
import { exec } from '@actions/exec'
import { commitChanges, enableCorepack, mergeBranch, pushChanges, setupNode } from '../operations'

const UPLOAD_API_SCRIPT = `
pnpm run dev > /tmp/tdesign-api.log 2>&1 &
server_pid=$!
trap 'kill $server_pid 2>/dev/null || true' EXIT

for attempt in $(seq 1 12); do
  if ! kill -0 $server_pid 2>/dev/null; then
    cat /tmp/tdesign-api.log
    exit 1
  fi
  if pnpm api:upload; then
    exit 0
  fi
  sleep 5
done

cat /tmp/tdesign-api.log
exit 1
`

function uploadApiData(): TriggerOperation {
  return {
    name: '重新生成并上传 API 数据',
    async run({ cwd, env }: OperationContext) {
      await exec('pnpm', ['ci'], { cwd, env })
      await exec('bash', ['-eo', 'pipefail', '-c', UPLOAD_API_SCRIPT], { cwd, env })
    },
  }
}

export const apiAdapter: RepositoryAdapter = {
  '/resolve-conflict': [
    mergeBranch('main', [
      { pattern: 'db/TDesign.db', strategy: 'theirs' },
    ], {
      commit: false,
      skipWhenNoConflicts: true,
    }),
    setupNode(),
    enableCorepack(),
    uploadApiData(),
    commitChanges('chore: resolve conflict'),
    pushChanges(),
  ],
}
