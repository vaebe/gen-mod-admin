import { expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const json = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))

test('workspace exposes the official server and Vue applications without nested repositories', () => {
  expect(existsSync(resolve(root, 'package.json'))).toBe(true)
  expect(json('package.json').private).toBe(true)
  const workspace = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
  expect(workspace).toMatch(/apps\/\*/)
  expect(workspace).toMatch(/packages\/\*/)
  expect(json('apps/server/package.json').dependencies.elysia).toBeDefined()
  const admin = json('apps/admin/package.json')
  expect(admin.dependencies.vue).toBeDefined()
  expect(admin.devDependencies['vite-plus']).toBeDefined()
  expect(existsSync(resolve(root, 'apps/admin/src/App.vue'))).toBe(true)
  expect(existsSync(resolve(root, 'apps/server/src/index.ts'))).toBe(true)
  for (const app of ['server', 'admin']) {
    expect(existsSync(resolve(root, 'apps', app, '.git'))).toBe(false)
  }
})
