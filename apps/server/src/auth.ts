import { Elysia, t } from 'elysia'
import type { Env } from './env'
import { ApiError } from './errors'
import { digest, hashPassword, verifyPassword } from './password'

const encoder = new TextEncoder()
const base64url = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0))
type User = { id: string; email: string; password_hash: string }
const role = (env: Env, email: string) => env.ADMIN_EMAILS.split(',').map(item => item.trim().toLowerCase()).includes(email.toLowerCase()) ? 'admin' : 'user'
const publicUser = (env: Env, user: User) => ({ email: user.email, role: role(env, user.email) })
async function signingKey(env: Env) {
  if (!env.JWT_SECRET) { throw new Error('JWT_SECRET 未配置') }
  return crypto.subtle.importKey('raw', encoder.encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
async function accessToken(env: Env, user: User) {
  const body = `${base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))}.${base64url(encoder.encode(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 900 })))}`
  return `${body}.${base64url(new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(body))))}`
}
function cookieId(request: Request) {
  return request.headers.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith('gm_session='))?.slice('gm_session='.length)
}
function cookieHeader(env: Env, request: Request, value: string, maxAge: number) {
  return `gm_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}${env.COOKIE_DOMAIN ? `; Domain=${env.COOKIE_DOMAIN}` : ''}`
}
export async function authenticate(env: Env, request: Request) {
  let userId: string | undefined
  const bearer = request.headers.get('authorization')
  if (bearer?.startsWith('Bearer ')) {
    const key = await signingKey(env)
    try {
      const [header, payload, signature, extra] = bearer.slice(7).split('.')
      if (!header || !payload || !signature || extra || JSON.parse(new TextDecoder().decode(decode(header))).alg !== 'HS256') { throw new Error('invalid JWT') }
      if (!await crypto.subtle.verify('HMAC', key, decode(signature), encoder.encode(`${header}.${payload}`))) { throw new Error('invalid JWT') }
      const claims = JSON.parse(new TextDecoder().decode(decode(payload)))
      if (typeof claims.sub !== 'string' || typeof claims.exp !== 'number' || claims.exp <= Date.now() / 1000) { throw new Error('expired JWT') }
      userId = claims.sub
    } catch { throw new ApiError(401, '登录凭证无效') }
  } else {
    const session = cookieId(request)
    if (session) {
      const row = await env.DB.prepare('SELECT user_id FROM cookie_sessions WHERE id=? AND expires_at>?').bind(session, new Date().toISOString()).first<{ user_id: string }>()
      userId = row?.user_id
    }
  }
  const user = userId ? await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first<User>() : null
  if (!user) { throw new ApiError(401, '登录凭证无效') }
  return { ...publicUser(env, user), id: user.id }
}
export async function requireAdmin(env: Env, request: Request) {
  const user = await authenticate(env, request)
  if (user.role !== 'admin') { throw new ApiError(403, '需要管理员权限') }
  return user
}
const credentials = t.Object({ email: t.String({ format: 'email' }), password: t.String({ minLength: 1 }) })
export function authRoutes(env: Env) {
  return new Elysia()
    .post('/auth/register', async ({ body }) => {
      const email = body.email.trim().toLowerCase()
      if (await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first()) { throw new ApiError(409, '邮箱已注册') }
      const user = { id: crypto.randomUUID(), email, password_hash: await hashPassword(body.password) }
      await env.DB.prepare('INSERT INTO users VALUES (?,?,?,?)').bind(user.id, email, user.password_hash, new Date().toISOString()).run()
      return publicUser(env, user)
    }, { body: credentials })
    .post('/auth/login', async ({ body, request, set }) => {
      const user = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(body.email.trim().toLowerCase()).first<User>()
      if (!user || !await verifyPassword(body.password, user.password_hash)) { throw new ApiError(401, '邮箱或密码不正确') }
      const refreshToken = crypto.randomUUID() + crypto.randomUUID()
      const expires = new Date(Date.now() + 30 * 86400000).toISOString()
      await env.DB.prepare('INSERT INTO refresh_tokens VALUES (?,?,?,?)').bind(crypto.randomUUID(), user.id, await digest(refreshToken), expires).run()
      const session = crypto.randomUUID()
      await env.DB.prepare('INSERT INTO cookie_sessions VALUES (?,?,?)').bind(session, user.id, expires).run()
      set.headers['set-cookie'] = cookieHeader(env, request, session, 30 * 86400)
      return { ...publicUser(env, user), accessToken: await accessToken(env, user), refreshToken }
    }, { body: credentials })
    .get('/auth/me', async ({ request }) => { const { id, ...user } = await authenticate(env, request); return user })
    .post('/auth/refresh', async ({ body }) => {
      const token = await env.DB.prepare('SELECT user_id FROM refresh_tokens WHERE token_hash=? AND expires_at>?').bind(await digest(body.refreshToken), new Date().toISOString()).first<{ user_id: string }>()
      const user = token ? await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(token.user_id).first<User>() : null
      if (!user) { throw new ApiError(401, '登录凭证无效') }
      return { ...publicUser(env, user), accessToken: await accessToken(env, user), refreshToken: body.refreshToken }
    }, { body: t.Object({ refreshToken: t.String() }) })
    .post('/auth/logout', async ({ body, request, set }) => {
      if (body.refreshToken) {
        await env.DB.prepare('DELETE FROM refresh_tokens WHERE token_hash=?').bind(await digest(body.refreshToken)).run()
      } else {
        const session = cookieId(request)
        if (session) { await env.DB.prepare('DELETE FROM cookie_sessions WHERE id=?').bind(session).run() }
        set.headers['set-cookie'] = cookieHeader(env, request, '', 0)
      }
      return { ok: true }
    }, { body: t.Object({ refreshToken: t.Optional(t.String()) }) })
}
