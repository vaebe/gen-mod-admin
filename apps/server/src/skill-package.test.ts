import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { strToU8, unzipSync, zipSync } from 'fflate'
import { hashAndValidate } from './skill-package'

export const manifest = { category: 'common' as const, gameId: null, version: '2.1.0', dependencies: [], excludePaths: ['.delivery', 'build'], requiredCommandScripts: [], inspectionFile: null }
export const description = '当在 GenMod 工作台新建、续改、排查、整理玩家反馈或交付游戏 MOD 时使用。'
export const validZip = () => new Uint8Array(readFileSync(new URL('./fixtures/mod-workflow.zip', import.meta.url)))
const validate = (bytes = validZip(), fields = manifest, name = 'mod-workflow') => hashAndValidate(bytes, fields, { name, description })
test('valid real workflow zip produces stable hash, independent of zip container bytes', async () => {
  const bytes = validZip(); const hash = await validate(bytes)
  expect(hash).toMatch(/^[a-f0-9]{64}$/)
  expect(hash).toBe('ec595d7587ddc7c3bcac08679b73c823438689822b7ed7e6ce2bd8c57d1f7a91')
  expect(await validate(zipSync(unzipSync(bytes), { level: 0 }))).toBe(hash)
  expect(await validate(bytes, { ...manifest, version: '2.2.0' })).not.toBe(hash)
})
test('rejects missing, mismatching and nested SKILL.md', async () => {
  await expect(validate(validZip(), manifest, 'different')).rejects.toThrow('不一致')
  await expect(validate(zipSync({ 'readme.txt': strToU8('missing') }))).rejects.toThrow('SKILL.md')
  const nested = Object.fromEntries(Object.entries(unzipSync(validZip())).map(([name, bytes]) => [`nested/${name}`, bytes]))
  await expect(validate(zipSync(nested))).rejects.toThrow('SKILL.md')
})
test('requires declared scripts and valid inspection rules; refuses escaping or missing Markdown links', async () => {
  await expect(hashAndValidate(validZip(), { ...manifest, requiredCommandScripts: ['scripts/missing.ps1'] }, { name: 'mod-workflow', description })).rejects.toThrow('脚本')
  const files = unzipSync(validZip())
  files['references/bad.md'] = strToU8('[escape](../../outside.md)')
  await expect(validate(zipSync(files))).rejects.toThrow('越界')
  files['references/bad.md'] = strToU8('[missing](not-here.md)')
  await expect(validate(zipSync(files))).rejects.toThrow('不存在')
  files['references/bad.md'] = strToU8('text')
  files['inspection.json'] = strToU8('{"schemaVersion":9,"profiles":[]}')
  await expect(hashAndValidate(zipSync(files), { ...manifest, inspectionFile: 'inspection.json' }, { name: 'mod-workflow', description })).rejects.toThrow('调查')
})
