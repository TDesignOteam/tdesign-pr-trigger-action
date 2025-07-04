import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  noExternal: ['@actions/core', '@actions/github', '@actions/exec', 'node-cnb'],
})
