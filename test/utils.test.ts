import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { addContributor } from '../src/utils'

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
})
