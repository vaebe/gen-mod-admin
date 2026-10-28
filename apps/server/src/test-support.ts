import { Database } from 'bun:sqlite'
import { readFileSync } from 'node:fs'
import { createApp } from './app'
import type { Env } from './env'

export function fixture(adminEmails = 'ADMIN@example.com') {
  const sqlite = new Database(':memory:')
  sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
  let failVersions = false
  const prepare = (sql: string) => {
    let values: any[] = []
    const statement = {
      bind(...args: any[]) { values = args; return statement },
      async first() { return sqlite.query(sql).get(...values) },
      async all() { return { success: true, results: sqlite.query(sql).all(...values) } },
      async run() {
        if (failVersions && /INSERT INTO skill_versions/i.test(sql)) { throw new Error('D1 write failed') }
        const result = sqlite.query(sql).run(...values)
        return { success: true, meta: { changes: result.changes } }
      },
    }
    return statement
  }
  const objects = new Map<string, Uint8Array>()
  const env = {
    DB: { prepare, batch: async (items: any[]) => {
      sqlite.exec('BEGIN')
      try { const results = []; for (const item of items) { results.push(await item.run()) }; sqlite.exec('COMMIT'); return results }
      catch (error) { sqlite.exec('ROLLBACK'); throw error }
    } },
    SKILL_PACKS: {
      async put(key: string, bytes: Uint8Array) { objects.set(key, new Uint8Array(bytes)) },
      async get(key: string) { const bytes = objects.get(key); return bytes ? { body: bytes, arrayBuffer: async () => bytes.slice().buffer } : null },
      async delete(key: string) { objects.delete(key) },
    },
    ADMIN_EMAILS: adminEmails, JWT_SECRET: 'local-test-secret-only',
  } as unknown as Env
  const app = createApp(env)
  async function request(path: string, method = 'GET', body?: unknown, token?: string, cookie?: string) {
    const headers = new Headers()
    if (token) { headers.set('authorization', `Bearer ${token}`) }
    if (cookie) { headers.set('cookie', cookie) }
    if (body !== undefined && !(body instanceof FormData)) { headers.set('content-type', 'application/json') }
    const response = await app.handle(new Request(`http://localhost${path}`, {
      method, headers, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }))
    const parsed = await response.clone().json().catch(() => null)
    return { status: response.status, body: parsed as any, response }
  }
  async function login(email = 'admin@example.com') {
    await request('/auth/register', 'POST', { email, password: 'password12' })
    return request('/auth/login', 'POST', { email, password: 'password12' })
  }
  return { sqlite, env, objects, request, login, failVersionWrites() { failVersions = true } }
}
