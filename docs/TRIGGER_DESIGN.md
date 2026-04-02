# 触发器设计说明

## 设计思路

通过一个指令,从 A 仓库触发 B 仓库变更。根据触发源仓库的不同,触发不同的变更逻辑:

### 场景 1: 从 tdesign-common 触发

当在 `tdesign-common` 仓库触发时,目的是让对方仓库更新 git 子模块。

**示例:**

- `/pr-vue` → 触发 `tdesign-vue` 更新 common 子模块
- `/pr-vue-next` → 触发 `tdesign-vue-next` 更新 common 子模块
- `/pr-react` → 触发 `tdesign-react` 更新 common 子模块
- `/pr-mobile-vue` → 触发 `tdesign-mobile-vue` 更新 common 子模块
- `/pr-mobile-react` → 触发 `tdesign-mobile-react` 更新 common 子模块
- `/pr-miniprogram` → 触发 `tdesign-miniprogram` 更新 common 子模块

**触发流程:**

1. 检查 common 仓库的 PR 是否已合并
2. 克隆目标仓库
3. 初始化并更新 common 子模块
4. 创建新分支并提交更改
5. 如果是移动端仓库,额外运行 CSS 变量更新
6. 创建 PR 到目标仓库

### 场景 2: 从 tdesign-icons 触发

当在 `tdesign-icons` 仓库触发时,目的是触发 icons 依赖相关的变更。

**示例:**

- `/pr-vue` → 触发 `tdesign-vue` 更新 `tdesign-icons-vue` 依赖,运行相关脚本
- `/pr-vue-next` → 触发 `tdesign-vue-next` 更新 `tdesign-icons-vue-next` 依赖,运行相关脚本
- `/pr-react` → 触发 `tdesign-react` 更新 `tdesign-icons-react` 依赖,运行相关脚本
- `/pr-mobile-vue` → 触发 `tdesign-mobile-vue` 更新 `tdesign-icons-vue-next` 依赖,运行相关脚本
- `/pr-mobile-react` → 触发 `tdesign-mobile-react` 更新 `tdesign-icons-react` 依赖,运行相关脚本
- `/pr-miniprogram` → 触发 `tdesign-miniprogram` 更新 `cdn-iconfont` 依赖,运行相关脚本
- `/pr-tdesign` → 触发 `tdesign-tdesign` 更新 `tdesign-icons` 依赖,运行相关脚本

**触发流程:**

1. 获取目标仓库对应的 icons 包名
2. 获取最新版本号
3. 克隆目标仓库并初始化子模块
4. 安装依赖
5. 升级 icons 包版本
6. 如果是小程序仓库,运行图标更新脚本
7. 运行快照更新测试
8. 创建 PR 到目标仓库

### 场景 3: 在 PR 评论中触发自身仓库更新

当在某个仓库的 PR 中评论 `/update-common` 或 `/update-snapshot` 指令时,自动更新该仓库的相关内容,并在当前 PR 上评论结果。

**示例:**

- `/update-common` → 在 `tdesign-vue` 等仓库的 PR 中评论,更新该仓库的 `tdesign-common` 子模块
- `/update-snapshot` → 在仓库的 PR 中评论,运行快照更新脚本(如 `npm run test:update`)

**`/update-common` 触发流程:**

1. 检查评论所在 PR 是否已合并
2. 克隆当前仓库
3. 检出 PR 分支
4. 初始化并更新 common 子模块
5. 合并 develop 分支并处理冲突(packages/common 使用 --ours)
6. 提交更改并推送 PR 分支
7. 在当前 PR 上评论更新结果

**`/update-snapshot` 触发流程:**

1. 检查评论所在 PR 是否已合并
2. 克隆当前仓库
3. 检出 PR 分支
4. 合并 develop 分支并处理冲突
5. 运行快照更新脚本
6. 提交更改并推送 PR 分支
7. 在当前 PR 上评论更新结果

**快照更新脚本配置:**

不同仓库使用不同的快照更新命令:

| 仓库                | 脚本命令                       |
| ------------------- | ------------------------------ |
| tdesign-vue-next    | `pnpm -r run test:update`      |
| tdesign-react       | `pnpm -r run test:update`      |
| tdesign-miniprogram | `pnpm -r run test:snap-update` |
| 其他仓库            | `npm run test:update`          |

**PR 评论结果:**

- **无需更新**: `✅ common 子模块已是最新版本，无需更新` / `✅ 快照已是最新版本，无需更新`
- **已更新**: `✅ 已更新 common 子模块，请合并该分支` / `✅ 已更新快照，请合并该分支`
- **更新失败**: `❌ 快照更新失败，请检查测试用例`

**特点:**

- `source: 'self'` 表示触发器针对当前仓库自身
- 使用 `context.repo` 和 `context.owner` 作为目标仓库
- 在当前 PR 上评论结果,而不是创建新 PR
- 适用于在开发过程中统一更新公共依赖或快照的场景

## 配置说明

### 映射配置 (`config/mapping.ts`)

```typescript
export type TriggerSource = 'common' | 'icons' | 'self'

export interface RepoMapping {
  source: TriggerSource // 触发源
  targetRepo: TdesignRepo // 目标仓库
  owner: string // 仓库所有者
  packageManager: string // 包管理器
  iconsPackage?: string // icons 包名(仅 icons 触发需要)
}
```

### 触发器分发逻辑 (`utils/trigger.ts`)

根据触发器的 `source` 字段自动选择处理函数:

```typescript
function executeAutoPr(context: TriggerContext): void {
  const source = getSource(context.trigger as AutoPrTrigger)

  switch (source) {
    case 'common':
      commonStart(context) // 处理跨仓库子模块更新
      break
    case 'icons':
      iconStart(context) // 处理 icons 依赖更新
      break
    case 'self':
      selfUpdate(context) // 处理自身仓库更新
      break
  }
}
```

## 分支命名规范

- **子模块更新**: `chore/submodule/common-pr-{prNumber}`
- **依赖更新**: `chore/deps/{depName}/{version}`
- **Icons 更新**: `chore/icon/{packageName}/{version}`

## PR 标题规范

- **子模块更新**: `chore(submodule): update common`
- **依赖更新**: `chore(deps): upgrade {dep} to {version}`
- **Icons 更新**: `feat(Icon): upgrade {packageName} to {version}`
- **CSS 变量**: `docs: update css vars`
- **快照更新**: `chore: update snapshot`
