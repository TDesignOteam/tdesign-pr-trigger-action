# tdesign-pr-trigger-action

通过 PR 评论指令执行 TDesign 仓库自动化任务。

## 跨仓库指令

在 `tdesign-icons` 或 `tdesign-common` 的 PR 中使用 `/pr-*` 指令，向对应组件仓库创建更新 PR。

| 指令               | 目标仓库               |
| ------------------ | ---------------------- |
| `/pr-vue`          | `tdesign-vue`          |
| `/pr-vue-next`     | `tdesign-vue-next`     |
| `/pr-react`        | `tdesign-react`        |
| `/pr-mobile-vue`   | `tdesign-mobile-vue`   |
| `/pr-mobile-react` | `tdesign-mobile-react` |
| `/pr-miniprogram`  | `tdesign-miniprogram`  |

目标仓库、图标依赖和包管理器由本 Action 统一维护，调用方不需要传入仓库适配配置。

## 仓库内指令

业务仓库可以通过评论指令更新当前 PR 分支。Action 负责：

- 解析指令并检查统一白名单
- 查询当前仓库的指令适配
- 获取并检出 PR 分支
- 顺序执行仓库配置的 Operations
- 处理已声明的合并冲突
- 提交并推送生成结果

普通评论、未知指令以及当前仓库未适配的指令会直接跳过。

### 支持矩阵

| 仓库                   | `/update-common` | `/update-ai-core` | `/update-snapshot` | `/update-coverage` | `/resolve-conflict` |
| ---------------------- | :--------------: | :---------------: | :----------------: | :----------------: | :-----------------: |
| `tdesign-vue`          |        ✓         |                   |         ✓          |         ✓          |                     |
| `tdesign-vue-next`     |        ✓         |                   |         ✓          |         ✓          |                     |
| `tdesign-react`        |        ✓         |         ✓         |         ✓          |         ✓          |                     |
| `tdesign-mobile-vue`   |        ✓         |                   |         ✓          |         ✓          |                     |
| `tdesign-mobile-react` |        ✓         |                   |         ✓          |         ✓          |                     |
| `tdesign-miniprogram`  |        ✓         |                   |         ✓          |                    |                     |
| `tdesign-api`          |                  |                   |                    |                    |          ✓          |

### 接入 Workflow

业务仓库只需要添加一个 `issue_comment` workflow，不需要 checkout、安装依赖或配置仓库命令：

```yaml
name: PR_COMMENT_CI

on:
  issue_comment:
    types: [created]

jobs:
  trigger:
    if: ${{ github.event.issue.pull_request }}
    runs-on: ubuntu-latest
    concurrency:
      group: pr-comment-${{ github.event.issue.number }}
      cancel-in-progress: false
    steps:
      # 发布后替换为固定的完整 commit SHA。
      - uses: TDesignOteam/tdesign-pr-trigger-action@<commit-sha>
        with:
          token: ${{ secrets.TDESIGN_BOT_TOKEN }}
```

`token` 需要读取 PR、评论和 reaction，以及向同仓 PR 分支推送的权限。当前仓库内更新暂不支持 fork PR。

统一白名单由本仓维护：

```text
.comment-trigger-whitelist
```

修改白名单后随 Action 版本一起发布，业务仓库不需要同步白名单文件。

## Operation Pipeline

每个“业务仓库 + 触发器”对应一个按顺序执行的 `TriggerOperation[]`：

```ts
export interface TriggerOperation {
  name: string
  run: (context: OperationContext) => Promise<void>
}

export type RepositoryAdapter = Partial<
  Record<RepositoryTrigger, TriggerOperation[]>
>
```

Operations 严格串行执行。任一 Operation 失败后，后续操作不会继续执行，并会在 PR 中评论失败步骤和 Actions run 地址。Git 认证环境与仓库脚本环境相互隔离，bot token 只用于 GitHub API 和 Git 网络操作。推送操作固定使用当前仓库 URL，拒绝 Git URL 重写，并覆盖仓库内的 credential helper、hooks 与外部传输协议配置。

### 公共操作

公共 Operation 位于 `src/operations/`：

- `updateSubmodule()`：更新指定子模块
- `mergeBranch()`：合并分支并按规则解决已知冲突
- `setupNode()`：根据业务仓 `.node-version` 选择 Runner Node.js 工具链
- `enableCorepack()`：根据 `package.json#packageManager` 激活精确包管理器版本
- `installDependencies()`：安装 npm 或 pnpm 依赖
- `runPackageScript()`：运行仓库脚本
- `addProgressComment()`：添加运行状态评论
- `commitChanges()`：存在变更时提交
- `pushChanges()`：向 PR head ref 推送，支持 `dry-run`

### 仓库适配

仓库注册表位于 `src/config/repository-adapters.ts`，业务实现位于 `src/tdesign/<repo>.ts`。

标准仓库可以直接组合公共 Operations：

```ts
export const vueAdapter: RepositoryAdapter = {
  '/update-common': [
    updateSubmodule('src/_common'),
    commitChanges('chore: update common'),
    mergeBranch('develop', [
      { pattern: 'src/_common', strategy: 'ours' },
    ]),
    pushChanges(),
  ],
}
```

同一个指令可以在不同仓库执行不同数量、顺序或实现的 Operations。仓库存在特殊处理时，可以在业务文件中定义方法并展开到流水线：

```ts
function updateSnapshot(): TriggerOperation[] {
  return [
    enableCorepack(),
    installDependencies('pnpm'),
    runPackageScript('pnpm', 'test:update'),
  ]
}

export const reactAdapter: RepositoryAdapter = {
  '/update-snapshot': [
    addProgressComment('快照更新'),
    mergeBranch('develop', snapshotConflictRules),
    ...updateSnapshot(),
    commitChanges('chore: update snapshot'),
    pushChanges(),
  ],
}
```

新增适配时只修改对应业务文件和注册表，不应在通用 runner 中增加仓库名称判断。

## 本地开发

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

源码修改后必须执行 `pnpm build`，将最新代码打包到 `dist/index.mjs`。
