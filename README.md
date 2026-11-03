# tdesign-pr-trigger-action

通过评论 触发 CI 自动化, [使用小技巧](./docs/github_comment.md)

## tdesign (主仓)

- [x] /pr-vue
- [x] /pr-vue-next
- [x] /pr-react
- [x] /pr-mobile-vue
- [x] /pr-mobile-react
- [x] /pr-miniprogram

主仓 PR 合并后评论，到对应组件仓库新建 PR 升级 `@tdesign/site-components` / `@tdesign/theme-generator` 站点依赖。

## tdesign-icons

- [x] /pr-vue
- [x] /pr-vue-next
- [x] /pr-react
- [x] /pr-mobile-vue
- [x] /pr-mobile-react
- [x] /pr-miniprogram
- [x] /pr-tdesign
- [x] /pr-flutter

icons 发布 PR 合并后评论，到对应仓库新建 PR 升级 icons 依赖（路径均相对 tdesign-icons 仓库）：

| 指令 | 目标仓库 | 依赖 | 版本号来源 | 日志来源 (CHANGELOG.md) |
| --- | --- | --- | --- | --- |
| /pr-vue | tdesign-vue | tdesign-icons-vue | npm registry | packages/vue |
| /pr-vue-next | tdesign-vue-next | tdesign-icons-vue-next | npm registry | packages/vue-next |
| /pr-react | tdesign-react | tdesign-icons-react | npm registry | packages/react |
| /pr-mobile-vue | tdesign-mobile-vue | tdesign-icons-vue-next | npm registry | packages/vue-next |
| /pr-mobile-react | tdesign-mobile-react | tdesign-icons-react | npm registry | packages/react |
| /pr-miniprogram | tdesign-miniprogram | cdn-iconfont | CDN iconfont 版本号 | packages/vue 最新小节 |
| /pr-tdesign | tdesign (主站点) | tdesign-icons-view | packages/view/package.json | packages/view |
| /pr-flutter | tdesign-flutter | tdesign_flutter_icons | packages/flutter/pubspec.yaml | packages/flutter |

- 指令只在发布 PR 合并后评论，develop 分支即本次发布内容：日志均从 develop 分支的 CHANGELOG.md 读取，/pr-tdesign 与 /pr-flutter 的版本号也从 develop 分支读取，不依赖 npm/pub 发布时序
- 发布 PR 描述不再携带日志，按版本号从对应包的 CHANGELOG.md 提取小节（cdn-iconfont 的 font 版本号与包版本对不上，取最新小节）
- PR body 使用目标仓库的 PR 模板，日志条目填入「📝 更新日志」，格式如 `- feat(Icon): 描述 @贡献者 ([icons#123](链接))`；已带署名的条目仅将链接标注为 `icons#N`，不重复追加
- 分组仓库（tdesign-react / tdesign-vue-next / tdesign-miniprogram）填入对应仓库小节，小程序同时填入 `tdesign-miniprogram` 与 `@tdesign/uniapp` 两个小节

## tdesign-common

- [x] /pr-vue
- [x] /pr-vue-next
- [x] /pr-react
- [x] /pr-mobile-vue
- [x] /pr-mobile-react
- [x] /pr-miniprogram
- [ ] /pr-flutter

## 组件仓库 (tdesign-vue / tdesign-vue-next / tdesign-react / tdesign-mobile-vue / tdesign-mobile-react / tdesign-miniprogram)

- [x] /update-common [pr_number]: 更新当前 PR 的 common 子模块到最新，带编号时指向对应 common PR 的 head
- [x] /update-snapshot: 合并 develop 并更新测试快照
- [x] /update-coverage: 更新 coverage badge

## 通用指令

- [x] /update-site: 合并 develop 到 main，触发官网更新
