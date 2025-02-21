# 组件库 PR 评论指令

## 背景

维护组件库时，经常会遇到 PR 需要更新 common 子仓，更新快照，处理 common 子仓冲突 ，处理快照冲突。此时就要在 PR 留言通知贡献者处理问题，还可能需要跟 PR 贡献者进行 N 轮评论沟通才能处理好问题。

简化处理这一系列反复繁琐的事情，通过在 PR 评论关键词触发 CI 进行自动化处理诞生了

## 评论指令

### /update-common

更新 PR common 子仓库的 `commit id` 到 最新

#### 自动运行了哪些

1. 合并 `develop` 分支
2. 检查 `common`子仓是否有冲突，如果有使用 `develop` 分支 `commit id` 指向
3. 提交变更，推送到 PR

### /update-snapshot

更新 PR 测试快照，部分快照更新 `node` 版本大于 `18` 会出现差异

#### 自动运行了哪些

1. 合并 `develop `分支
2. 检查 `common` 子仓是否有冲突，如果有使用 PR 分支 `commit id` 指向
3. 检查快照文件 `csr.test.js.snap` 是否有冲突，如果有使用 `develop` 分支 `csr.test.js.snap`
4. 检查快照文件 `ssr.test.js.snap` 是否有冲突，如果有使用 `develop` 分支 `ssr.test.js.snap`
5. 运行快照更新 `test:update`
6. 提交变更，推送到 PR

### /resolve-conflict

这个评论指令是在 `tdesign-api` 仓库使用，解决 `TDesign.db` 冲突问题

#### 自动运行了哪些

1. 合并 `main `分支
2. 检查 `TDesign.db` 是否有冲突，如果有使用 `main` 分支 `TDesign.db`
3. 运行 `api:upload`, 把 `api.json` 同步回 `TDesign.db`
4. 提交变更，推送到 PR

## 使用小技巧

指令太长不想记和手打怎么办

偷懒小技巧在这里[传送门](./github_comment.md)

## 白名单

需要github id 在[白名单](https://github.com/Tencent/tdesign/blob/main/.github/.pr-comment-ci-whitelist)才可以使用。

`/resolve-conflict` [白名单](https://github.com/TDesignOteam/tdesign-api/blob/main/.github/CODEOWNERS)单独存在
