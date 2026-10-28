import { Elysia, t } from 'elysia'
import type { ManifestSnapshot, SkillRecord, SkillVersionRecord } from '../../../packages/contracts/src/index'
import type { Env } from './env'
import { authenticate, requireAdmin } from './auth'
import { ApiError } from './errors'
import { validName } from './validation'
import { hashAndValidate } from './skill-package'

interface SkillRow {
  id: string; name: string; description: string; kind: 'game' | 'common'; game_id: string | null
  dependencies: string; exclude_paths: string; required_command_scripts: string; inspection_file: string | null
}
interface VersionRow { id: string; skill_id: string; version: string; content_hash: string; file_id: string; uploaded_at: string; manifest: string }
const skillRecord = (row: SkillRow) => ({ id: row.id, name: row.name, description: row.description, kind: row.kind, gameId: row.game_id, dependencies: JSON.parse(row.dependencies), excludePaths: JSON.parse(row.exclude_paths), requiredCommandScripts: JSON.parse(row.required_command_scripts), inspectionFile: row.inspection_file }) as SkillRecord
const versionRecord = (row: VersionRow): SkillVersionRecord => ({ id: row.id, skillId: row.skill_id, version: row.version, contentHash: row.content_hash, fileId: row.file_id, uploadedAt: row.uploaded_at, manifest: JSON.parse(row.manifest) })
const fields = {
  dependencies: t.Optional(t.Array(t.String())), excludePaths: t.Optional(t.Array(t.String())),
  requiredCommandScripts: t.Optional(t.Array(t.String())), inspectionFile: t.Optional(t.Union([t.String(), t.Null()])),
}
async function readSkill(env: Env, id: string) {
  const row = await env.DB.prepare('SELECT * FROM skills WHERE id=?').bind(id).first<SkillRow>()
  if (!row) { throw new ApiError(404, 'Skill 不存在') }
  return skillRecord(row)
}
export function skillRoutes(env: Env) {
  return new Elysia()
    .get('/skills', async ({ request }) => {
      await authenticate(env, request)
      const skills = (await env.DB.prepare('SELECT * FROM skills ORDER BY created_at,id').all<SkillRow>()).results
      return Promise.all(skills.map(async row => ({ ...skillRecord(row), versions: (await env.DB.prepare('SELECT * FROM skill_versions WHERE skill_id=? ORDER BY uploaded_at DESC,id DESC').bind(row.id).all<VersionRow>()).results.map(versionRecord) })))
    })
    .post('/skills', async ({ request, body }) => {
      await requireAdmin(env, request)
      if (!validName(body.name)) { throw new ApiError(400, 'Skill 名称无效') }
      if (body.kind === 'common' ? body.gameId !== null : !body.gameId || !await env.DB.prepare('SELECT id FROM games WHERE id=?').bind(body.gameId).first()) { throw new ApiError(400, '游戏 Skill 必须绑定已有游戏；通用 Skill 不绑定游戏') }
      if (await env.DB.prepare('SELECT id FROM skills WHERE name=?').bind(body.name).first()) { throw new ApiError(409, 'Skill 名称已存在') }
      const id = crypto.randomUUID()
      await env.DB.prepare('INSERT INTO skills(id,name,description,kind,game_id,dependencies,exclude_paths,required_command_scripts,inspection_file,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(id, body.name, body.description, body.kind, body.gameId, JSON.stringify(body.dependencies ?? []), JSON.stringify(body.excludePaths ?? []), JSON.stringify(body.requiredCommandScripts ?? []), body.inspectionFile ?? null, new Date().toISOString()).run()
      return readSkill(env, id)
    }, { body: t.Object({ name: t.String(), description: t.String({ minLength: 1 }), kind: t.Union([t.Literal('common'), t.Literal('game')]), gameId: t.Union([t.String(), t.Null()]), ...fields }) })
    .patch('/skills/:id', async ({ request, params, body }) => {
      await requireAdmin(env, request)
      const old = await readSkill(env, params.id)
      await env.DB.prepare('UPDATE skills SET description=?,dependencies=?,exclude_paths=?,required_command_scripts=?,inspection_file=? WHERE id=?')
        .bind(body.description, JSON.stringify(body.dependencies ?? old.dependencies), JSON.stringify(body.excludePaths ?? old.excludePaths), JSON.stringify(body.requiredCommandScripts ?? old.requiredCommandScripts), body.inspectionFile === undefined ? old.inspectionFile : body.inspectionFile, params.id).run()
      return readSkill(env, params.id)
    }, { body: t.Object({ description: t.String({ minLength: 1 }), ...fields }, { additionalProperties: false }) })
    .post('/skills/:id/versions', async ({ request, params }) => {
      await requireAdmin(env, request)
      const skill = await readSkill(env, params.id)
      const current = (await env.DB.prepare('SELECT * FROM skill_versions WHERE skill_id=?').bind(params.id).all<VersionRow>()).results
      if (current.length >= 5) { throw new ApiError(409, '最多 5 个版本，请先移除旧版本') }
      const form = await request.formData()
      const version = form.get('version'); const zip = form.get('zip')
      if (typeof version !== 'string' || !version.trim() || !(zip instanceof Blob)) { throw new ApiError(400, '需要版本号和 zip 文件') }
      if (current.some(item => item.version === version)) { throw new ApiError(409, '版本号已存在；内容变更请提高版本号') }
      const values: Record<string, unknown> = {}
      try {
        for (const key of ['dependencies', 'excludePaths', 'requiredCommandScripts', 'inspectionFile'] as const) {
          const raw = form.get(key); values[key] = raw === null ? skill[key] : JSON.parse(String(raw))
          if (key === 'inspectionFile' ? values[key] !== null && typeof values[key] !== 'string' : !Array.isArray(values[key]) || !(values[key] as unknown[]).every(value => typeof value === 'string')) { throw new Error('清单字段类型无效') }
        }
      } catch { throw new ApiError(400, '清单字段需有效 JSON 数组或 inspectionFile 字符串/null') }
      const manifest = { ...values, category: skill.kind, gameId: skill.gameId, version } as ManifestSnapshot
      const bytes = new Uint8Array(await zip.arrayBuffer())
      let contentHash: string
      try { contentHash = await hashAndValidate(bytes, manifest, skill) } catch (error) { throw new ApiError(400, error instanceof Error ? error.message : 'zip 校验失败') }
      const record: SkillVersionRecord = { id: crypto.randomUUID(), skillId: skill.id, version, contentHash, fileId: crypto.randomUUID(), uploadedAt: new Date().toISOString(), manifest }
      await env.SKILL_PACKS.put(record.fileId, bytes)
      // 同一次 D1 batch 内插入并保存清单字段；条件插入防止并发突破五版本上限。
      const results = await env.DB.batch([
        env.DB.prepare('INSERT INTO skill_versions(id,skill_id,version,content_hash,file_id,uploaded_at,manifest) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM skill_versions WHERE skill_id=?)<5')
          .bind(record.id, skill.id, version, contentHash, record.fileId, record.uploadedAt, JSON.stringify(manifest), skill.id),
        env.DB.prepare('UPDATE skills SET dependencies=?,exclude_paths=?,required_command_scripts=?,inspection_file=? WHERE id=? AND EXISTS (SELECT 1 FROM skill_versions WHERE id=?)')
          .bind(JSON.stringify(manifest.dependencies), JSON.stringify(manifest.excludePaths), JSON.stringify(manifest.requiredCommandScripts), manifest.inspectionFile, skill.id, record.id),
      ])
      if (results[0]!.meta.changes === 0) { throw new ApiError(409, '最多 5 个版本，请先移除旧版本') }
      return record
    }, { parse: 'none' })
    .delete('/skills/:id/versions/:versionId', async ({ request, params }) => {
      await requireAdmin(env, request)
      const row = await env.DB.prepare('SELECT * FROM skill_versions WHERE id=? AND skill_id=?').bind(params.versionId, params.id).first<VersionRow>()
      if (!row) { throw new ApiError(404, '版本不存在') }
      await env.DB.prepare('DELETE FROM skill_versions WHERE id=?').bind(row.id).run()
      if (!await env.DB.prepare('SELECT id FROM skill_versions WHERE file_id=? LIMIT 1').bind(row.file_id).first()) { await env.SKILL_PACKS.delete(row.file_id) }
      return { ok: true }
    })
    .get('/files/:fileId', async ({ request, params }) => {
      await authenticate(env, request)
      if (!await env.DB.prepare('SELECT id FROM skill_versions WHERE file_id=? LIMIT 1').bind(params.fileId).first()) { throw new ApiError(404, '文件不存在') }
      const object = await env.SKILL_PACKS.get(params.fileId)
      if (!object) { throw new ApiError(404, '文件不存在') }
      return new Response(object.body, { headers: { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${params.fileId}.zip"` } })
    })
}
