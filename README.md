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
