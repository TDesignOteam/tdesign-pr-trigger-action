import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { adaptChangelogForRepo, addContributor, buildPrBody, changelogSectionToEntries, extractChangelogSection } from '../src/utils'

describe('extractChangelogSection', () => {
  const changelog = [
    '# tdesign-icons-view',
    '',
    '## 🌈 0.5.15 `2026-10-30`',
    '',
    '### 🚀 Features',
    '',
    '- 新增 `check-1` 和 `remove-1` 图标 @uyarn ([#319](https://github.com/Tencent/tdesign-icons/pull/319))',
    '',
    '## 🌈 0.5.14 `2026-09-18`',
    '',
    '### 🐞 Bug Fixes',
    '',
    '- 修复 0.5.13 处理透明色不彻底的问题',
    '',
  ].join('\n')

  it('提取对应版本小节', () => {
    expect(extractChangelogSection(changelog, '0.5.15')).toBe(
      [
        '## 🌈 0.5.15 `2026-10-30`',
        '',
        '### 🚀 Features',
        '',
        '- 新增 `check-1` 和 `remove-1` 图标 @uyarn ([#319](https://github.com/Tencent/tdesign-icons/pull/319))',
      ].join('\n'),
    )
    expect(extractChangelogSection(changelog, '0.5.14')).toBe(
      [
        '## 🌈 0.5.14 `2026-09-18`',
        '',
        '### 🐞 Bug Fixes',
        '',
        '- 修复 0.5.13 处理透明色不彻底的问题',
      ].join('\n'),
    )
  })

  it('不传版本号时取最新小节', () => {
    expect(extractChangelogSection(changelog)).toBe(
      [
        '## 🌈 0.5.15 `2026-10-30`',
        '',
        '### 🚀 Features',
        '',
        '- 新增 `check-1` 和 `remove-1` 图标 @uyarn ([#319](https://github.com/Tencent/tdesign-icons/pull/319))',
      ].join('\n'),
    )
  })

  it('版本号不误匹配前缀相同的版本', () => {
    expect(extractChangelogSection(changelog, '0.5.1')).toBe('')
    expect(extractChangelogSection(changelog, '0.5.151')).toBe('')
  })

  it('未找到版本返回空字符串', () => {
    expect(extractChangelogSection(changelog, '9.9.9')).toBe('')
  })
})

describe('changelogSectionToEntries', () => {
  const section = [
    '## 🌈 0.4.12 `2026-10-30`',
    '',
    '### 🚀 Features',
    '',
    '- 新增 `check-1` 图标',
    '- 新增 `remove-1` 图标 @uyarn ([#319](https://github.com/Tencent/tdesign-icons/pull/319))',
    '',
    '### 🐞 Bug Fixes',
    '',
    '- 修复 usb 图标深色模式渲染错误',
    '',
  ].join('\n')

  it('按分组转为 conventional commits 条目', () => {
    expect(changelogSectionToEntries(section)).toEqual([
      '- feat(Icon): 新增 `check-1` 图标',
      '- feat(Icon): 新增 `remove-1` 图标 @uyarn ([#319](https://github.com/Tencent/tdesign-icons/pull/319))',
      '- fix(Icon): 修复 usb 图标深色模式渲染错误',
    ])
  })
})

describe('buildPrBody', () => {
  const entries = ['- feat(Icon): 新增 `check-1` 图标']

  it('分组模板填入对应仓库小节', () => {
    const template = [
      '### 📝 更新日志',
      '',
      '- [ ] 本条 PR 不需要纳入 Changelog',
      '',
      '#### tdesign-miniprogram',
      '<!--',
      '- feat(组件名称): 处理问题或特性描述',
      '-->',
      '',
      '#### @tdesign/uniapp',
      '',
    ].join('\r\n')
    const body = buildPrBody(template, entries, ['tdesign-miniprogram'])
    // 条目填入小节内示例注释之后
    expect(body).toContain('-->\r\n\r\n- feat(Icon): 新增 `check-1` 图标\r\n')
    // 示例注释与其他小节不受影响
    expect(body).toContain('- feat(组件名称): 处理问题或特性描述')
    expect(body).toContain('#### @tdesign/uniapp')
    expect(body).toContain('- [ ] 本条 PR 不需要纳入 Changelog')
  })

  it('小程序日志同时填入主包与 uniapp 小节', () => {
    const template = [
      '### 📝 更新日志',
      '',
      '#### tdesign-miniprogram',
      '<!--',
      '- feat(组件名称): 处理问题或特性描述',
      '--> ',
      '',
      '#### @tdesign/uniapp',
      '<!--',
      '- feat(组件名称): 处理问题或特性描述',
      '-->',
      '',
      '#### @tdesign/uniapp-chat',
      '',
    ].join('\r\n')
    const body = buildPrBody(template, entries, ['tdesign-miniprogram', '@tdesign/uniapp'])
    expect(body.match(/- feat\(Icon\): 新增 `check-1` 图标/g)).toHaveLength(2)
    expect(body).toContain('--> \r\n\r\n- feat(Icon): 新增 `check-1` 图标\r\n')
    // 未配置的小节不受影响
    expect(body).toContain('#### @tdesign/uniapp-chat')
  })

  it('普通模板填入跳过勾选行之前', () => {
    const template = [
      '### 📝 更新日志',
      '',
      '<!--',
      '从用户角度描述具体变化。',
      '-->',
      '',
      '- [ ] 本条 PR 不需要纳入 Changelog',
      '',
      '### ☑️ 请求合并前的自查清单',
    ].join('\r\n')
    const body = buildPrBody(template, entries, ['tdesign-vue'])
    expect(body).toContain('-->\r\n\r\n- feat(Icon): 新增 `check-1` 图标\r\n\r\n- [ ] 本条 PR 不需要纳入 Changelog')
  })

  it('无模板时直接返回条目', () => {
    expect(buildPrBody('', entries, ['tdesign-vue'])).toBe('- feat(Icon): 新增 `check-1` 图标')
  })
})

describe('utils', () => {
  describe('addContributor', () => {
    it('one log', () => {
      const pr_body = readFileSync('test/fixtures/pr_body.md', 'utf8').replaceAll('\n', '\r\n')
      const link = `([common#2283](https://github.com/Tencent/tdesign-common/pull/2283))`
      const body = addContributor(pr_body, 'tdesign-helper', link)
      expect(body).toMatchSnapshot()
    })

    it('two log', () => {
      const pr_body = readFileSync('test/fixtures/pr_body_two_log.md', 'utf8').replaceAll('\n', '\r\n')
      const link = `([common#2283](https://github.com/Tencent/tdesign-common/pull/2283))`
      const body = addContributor(pr_body, 'tdesign-helper', link)
      expect(body).toMatchSnapshot()
    })

    it('no link log', () => {
      const pr_body = readFileSync('test/fixtures/pr_body.md', 'utf8').replaceAll('\n', '\r\n')
      const body = addContributor(pr_body, 'tdesign-helper')
      expect(body).toMatchSnapshot()
    })

    it('skip log', () => {
      const pr_body = readFileSync('test/fixtures/pr_body_skip_log.md', 'utf8').replaceAll('\n', '\r\n')
      const body = addContributor(pr_body, 'tdesign-helper')
      expect(body).toMatchSnapshot()
    })
  })

  describe('adaptChangelogForRepo', () => {
    it('tdesign-vue', () => {
      const pr_body = readFileSync('test/fixtures/pr_body.md', 'utf8').replaceAll('\n', '\r\n')
      const body = adaptChangelogForRepo(pr_body, 'tdesign-vue')

      expect(body).toMatchSnapshot()
    })
    it('tdesign-vue-next', () => {
      const pr_body = readFileSync('test/fixtures/pr_body.md', 'utf8').replaceAll('\n', '\r\n')
      const body = adaptChangelogForRepo(pr_body, 'tdesign-vue-next')

      expect(body).toMatchSnapshot()
    })
    it('tdesign-react', () => {
      const pr_body = readFileSync('test/fixtures/pr_body.md', 'utf8').replaceAll('\n', '\r\n')
      const body = adaptChangelogForRepo(pr_body, 'tdesign-react')

      expect(body).toMatchSnapshot()
    })
  })
})
