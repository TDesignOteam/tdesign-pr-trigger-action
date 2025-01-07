import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { addContributor } from '../src/utils'

describe('utils', () => {
  it('addContributor', () => {
    const pr_body = readFileSync('test/fixtures/pr_body.md', 'utf8').replaceAll('\n', '\r\n')

    const body = addContributor(pr_body, 'liweijie0812')
    expect(body).toMatchSnapshot()
    expect(true).toBe(true)
  })
})
