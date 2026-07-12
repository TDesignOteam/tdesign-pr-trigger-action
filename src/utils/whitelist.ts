import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function loadWhitelist(): string {
  const currentDirectory = dirname(fileURLToPath(import.meta.url))
  const paths = [
    resolve(currentDirectory, '../.comment-trigger-whitelist'),
    resolve(currentDirectory, '../../.comment-trigger-whitelist'),
  ]
  const whitelistPath = paths.find(path => existsSync(path))
  if (!whitelistPath) {
    throw new Error('找不到 .comment-trigger-whitelist')
  }
  return readFileSync(whitelistPath, 'utf8')
}

export function isWhitelisted(whitelist: string, user: string): boolean {
  return whitelist.split('\n').some(item => item.trim() === user)
}
