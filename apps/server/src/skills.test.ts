import { expect, test } from 'bun:test'
import { strToU8, zipSync } from 'fflate'
import { fixture } from './test-support'

export const skillInput = { name: 'workflow', description: 'desc', kind: 'common', gameId: null, dependencies: [], excludePaths: [], requiredCommandScripts: [], inspectionFile: null }
export const packageBytes = (content = 'text') => zipSync({ 'SKILL.md': strToU8(`---\nname: workflow\ndescription: desc\n---\n${content}`) })
const upload = (version: string, bytes = packageBytes()) => { const form = new FormData(); form.set('zip', new Blob([new Uint8Array(bytes).buffer]), 'skill.zip'); form.set('version', version); return form }
test('common Skill needs no game; game Skills require existing game; names unique and valid; admin only', async () => {
  const f = fixture(); const admin = (await f.login()).body.accessToken; const user = (await f.login('user@example.com')).body.accessToken
  expect((await f.request('/skills', 'POST', skillInput, user)).status).toBe(403)
  const created = await f.request('/skills', 'POST', skillInput, admin)
  expect(created.status).toBe(200)
  expect(created.body).toMatchObject({ ...skillInput })
  expect((await f.request('/skills', 'POST', skillInput, admin)).status).toBe(409)
  expect((await f.request('/skills', 'POST', { ...skillInput, name: 'Bad' }, admin)).status).toBe(400)
  for (const gameId of [null, 'unknown']) {
    expect((await f.request('/skills', 'POST', { ...skillInput, name: 'game-skill', kind: 'game', gameId }, admin)).status).toBe(400)
  }
  await f.request('/games', 'POST', { id: 'duckov', name: 'Duckov', description: '' }, admin)
  const game = await f.request('/skills', 'POST', { ...skillInput, name: 'duckov-mod', kind: 'game', gameId: 'duckov' }, admin)
  expect(game.status).toBe(200)
  expect((f.sqlite.query('SELECT game_id FROM skills WHERE id=?').get(game.body.id) as any).game_id).toBe('duckov')
})
test('versions expose file ids and snapshots; file id downloads original zip; caps at five without auto-removal', async () => {
  const f = fixture(); const token = (await f.login()).body.accessToken
  const skill = (await f.request('/skills', 'POST', skillInput, token)).body
  expect((await f.request('/skills', 'GET', undefined, token)).body[0].versions).toEqual([])
  const original = packageBytes()
  const first = await f.request(`/skills/${skill.id}/versions`, 'POST', upload('1', original), token)
  expect(first.status).toBe(200)
  expect(first.body.manifest).toMatchObject({ category: 'common', gameId: null, version: '1', dependencies: [] })
  const file = await f.request(`/files/${first.body.fileId}`, 'GET', undefined, token)
  expect(new Uint8Array(await file.response.arrayBuffer())).toEqual(original)
  expect((await f.request(`/skills/${skill.id}/versions`, 'POST', upload('1'), token)).status).toBe(409)
  expect((await f.request(`/skills/${skill.id}/versions`, 'POST', upload('1', packageBytes('changed')), token)).status).toBe(409)
  for (const version of ['2', '3', '4', '5']) { expect((await f.request(`/skills/${skill.id}/versions`, 'POST', upload(version), token)).status).toBe(200) }
  const sixth = await f.request(`/skills/${skill.id}/versions`, 'POST', upload('6'), token)
  expect(sixth.status).toBe(409); expect(sixth.body.error).toContain('先移除旧版本')
  expect((await f.request('/skills', 'GET', undefined, token)).body[0].versions).toHaveLength(5)
  await f.request(`/skills/${skill.id}/versions/${first.body.id}`, 'DELETE', undefined, token)
  expect(f.objects.has(first.body.fileId)).toBe(false)
  expect((await f.request(`/skills/${skill.id}/versions`, 'POST', upload('6'), token)).status).toBe(200)
})
test('D1 failure after successful R2 upload leaves version list unchanged', async () => {
  const f = fixture(); const token = (await f.login()).body.accessToken
  const skill = (await f.request('/skills', 'POST', skillInput, token)).body
  f.failVersionWrites()
  expect((await f.request(`/skills/${skill.id}/versions`, 'POST', upload('1'), token)).status).toBe(500)
  expect(f.objects.size).toBe(1)
  expect((await f.request('/skills', 'GET', undefined, token)).body[0].versions).toEqual([])
})
