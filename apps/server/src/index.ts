import { env } from 'cloudflare:workers'
import { createApp } from './app'
import type { Env } from './env'

export const app = createApp(env as unknown as Env)
export default app
