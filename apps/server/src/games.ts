import { Elysia, t } from 'elysia'
import type { Env } from './env'
import { authenticate, requireAdmin } from './auth'
import { ApiError } from './errors'
import { validName } from './validation'

const fields = { name: t.String({ minLength: 1 }), description: t.String() }
export function gameRoutes(env: Env) {
  return new Elysia()
    .get('/games', async ({ request }) => {
      await authenticate(env, request)
      return (await env.DB.prepare('SELECT id,name,description FROM games ORDER BY created_at,id').all()).results
    })
    .post('/games', async ({ request, body }) => {
      await requireAdmin(env, request)
      if (!validName(body.id)) { throw new ApiError(400, '游戏标识无效') }
      if (await env.DB.prepare('SELECT id FROM games WHERE id=?').bind(body.id).first()) { throw new ApiError(409, '游戏标识已存在') }
      await env.DB.prepare('INSERT INTO games VALUES (?,?,?,?)').bind(body.id, body.name, body.description, new Date().toISOString()).run()
      return body
    }, { body: t.Object({ id: t.String(), ...fields }) })
    .patch('/games/:id', async ({ request, params, body }) => {
      await requireAdmin(env, request)
      if (!await env.DB.prepare('SELECT id FROM games WHERE id=?').bind(params.id).first()) { throw new ApiError(404, '游戏不存在') }
      await env.DB.prepare('UPDATE games SET name=?,description=? WHERE id=?').bind(body.name, body.description, params.id).run()
      return { id: params.id, ...body }
    }, { body: t.Object(fields, { additionalProperties: false }) })
    .delete('/games/:id', async ({ request, params }) => {
      await requireAdmin(env, request)
      if (await env.DB.prepare('SELECT id FROM skills WHERE game_id=? LIMIT 1').bind(params.id).first()) { throw new ApiError(409, '仍有 Skill 绑定，不能删除游戏') }
      await env.DB.prepare('DELETE FROM games WHERE id=?').bind(params.id).run()
      return { ok: true }
    })
}
