import { Elysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import type { Env } from './env'
import { authRoutes } from './auth'
import { ApiError } from './errors'
import { gameRoutes } from './games'

export function createApp(env: Env) {
  return new Elysia({ adapter: CloudflareAdapter })
    .decorate('env', env)
    .onError(({ error, set }) => {
      if (error instanceof ApiError) { set.status = error.status; return { error: error.message } }
    })
    .get('/', () => 'Hello Elysia')
    .use(authRoutes(env))
    .use(gameRoutes(env))
    .compile()
}
