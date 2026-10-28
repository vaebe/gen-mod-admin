import { Elysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import type { Env } from './env'

export function createApp(env: Env) {
  return new Elysia({ adapter: CloudflareAdapter })
    .decorate('env', env)
    .get('/', () => 'Hello Elysia')
    .compile()
}
