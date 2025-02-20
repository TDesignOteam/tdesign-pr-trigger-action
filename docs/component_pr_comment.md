# 组件库 PR 评论指令

[评论指令使用小技巧](./github_comment.md)

## /update-common

更新 PR common 子仓库的 `commit id` 到 最新

### 自动运行了那些

1. 合并 `develop` 分支
2. 检查 `common`子模块是否有冲突，如果有使用 `develop` 分支 `commit id` 指向
3. 提交变更，推送到 PR

## /update-snapshot

更新 PR 测试快照，部分快照更新 `node` 版本大于 `18` 会出现差异

### 自动运行了那些

1. 合并 `develop `分支
2. 检查 `common` 子模块是否有冲突，如果有使用 PR 分支 `commit id` 指向
3. 检查快照文件 `csr.test.js.snap` 是否有冲突，如果有使用 `develop` 分支 `csr.test.js.snap`
4. 检查快照文件 `ssr.test.js.snap` 是否有冲突，如果有使用 `develop` 分支 `ssr.test.js.snap`
5. 运行快照更新 `test:update`
6. 提交变更，推送到 PR

## /resolve-conflict

这个评论指令是在 `tdesign-api` 仓库使用，解决 `TDesign.db` 冲突问题

### 自动运行了那些

1. 合并 `main `分支
2. 检查 `TDesign.db` 子模块是否有冲突，如果有使用 `main` 分支 `TDesign.db`
3. 运行 `api:upload`, 把 `api.json` 同步回 `TDesign.db`
4. 提交变更，推送到 PR
