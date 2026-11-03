import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { adaptChangelogForRepo, addContributor, extractChangelogSection } from '../src/utils'

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
