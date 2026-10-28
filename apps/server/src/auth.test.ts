import { expect, test } from 'bun:test'
import { fixture } from './test-support'

test('registers without exposing hashes and rejects duplicate email and wrong passwords', async () => {
  const f = fixture()
  const input = { email: 'a@b.c', password: 'password12' }
  const registered = await f.request('/auth/register', 'POST', input)
  expect(registered.status).toBe(200)
  expect(JSON.stringify(registered.body)).not.toContain('password')
  expect((await f.request('/auth/register', 'POST', input)).status).toBe(409)
  expect((await f.request('/auth/login', 'POST', { ...input, password: 'wrong' })).status).toBe(401)
  const row = f.sqlite.query('SELECT password_hash FROM users').get() as any
  expect(row.password_hash).not.toContain('password12')
})

test('login returns desktop tokens and HttpOnly cookie; both authorize me', async () => {
  const f = fixture()
  const result = await f.login()
  expect(result.status).toBe(200)
  expect(result.body).toMatchObject({ email: 'admin@example.com', role: 'admin' })
  expect(result.body.accessToken).toBeString()
  expect(result.body.refreshToken).toBeString()
  const cookie = result.response.headers.get('set-cookie')!
  expect(cookie).toContain('HttpOnly')
  expect((await f.request('/auth/me', 'GET', undefined, result.body.accessToken)).body.role).toBe('admin')
  expect((await f.request('/auth/me', 'GET', undefined, undefined, cookie.split(';')[0])).status).toBe(200)
  expect((await f.request('/auth/me')).status).toBe(401)
  expect((await f.login('user@example.com')).body.role).toBe('user')
})

test('refresh rejects forged credentials as 401 and renews real credentials', async () => {
  const f = fixture()
  const logged = await f.login()
  expect((await f.request('/auth/refresh', 'POST', { refreshToken: 'forged' })).status).toBe(401)
  const refreshed = await f.request('/auth/refresh', 'POST', { refreshToken: logged.body.refreshToken })
  expect(refreshed.status).toBe(200)
  expect((await f.request('/auth/me', 'GET', undefined, refreshed.body.accessToken)).status).toBe(200)
})

test('desktop and browser logout revoke only their own credentials', async () => {
  const f = fixture()
  const logged = await f.login()
  const cookie = logged.response.headers.get('set-cookie')!.split(';')[0]
  await f.request('/auth/logout', 'POST', { refreshToken: logged.body.refreshToken })
  expect((await f.request('/auth/me', 'GET', undefined, undefined, cookie)).status).toBe(200)
  expect((await f.request('/auth/refresh', 'POST', { refreshToken: logged.body.refreshToken })).status).toBe(401)
  const desktop = await f.login()
  await f.request('/auth/logout', 'POST', {}, undefined, cookie)
  expect((await f.request('/auth/me', 'GET', undefined, undefined, cookie)).status).toBe(401)
  expect((await f.request('/auth/me', 'GET', undefined, desktop.body.accessToken)).status).toBe(200)
})
