import { afterEach, expect, it, vi } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'
import LoginPage from '../features/auth/LoginPage.vue'
import SkillForm from '../features/skills/SkillForm.vue'
import SkillVersions from '../features/skills/SkillVersions.vue'
import GamesPage from '../features/games/GamesPage.vue'
import SkillFiles from '../features/skills/SkillFiles.vue'
import { folderZip } from '../features/skills/zip'
import { unzipSync, strToU8, strFromU8 } from 'fflate'

afterEach(() => vi.unstubAllGlobals())
it('login sends Cookie credentials and emits the logged-in user', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ email: 'a@b.c', role: 'admin' })))
  vi.stubGlobal('fetch', fetch)
  const page = mount(LoginPage)
  await page.get('input[type=email]').setValue('a@b.c')
  await page.get('input[type=password]').setValue('password12')
  await page.get('form').trigger('submit'); await flushPromises()
  expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ credentials: 'include', method: 'POST', body: JSON.stringify({ email: 'a@b.c', password: 'password12' }) }))
  expect(page.emitted('authenticated')?.[0]?.[0]).toMatchObject({ email: 'a@b.c', role: 'admin' })
})
it('allows common Skill without games and requires selection for game Skill', async () => {
  const form = mount(SkillForm, { props: { games: [] } })
  await form.get('[name=name]').setValue('workflow')
  await form.get('[name=description]').setValue('desc')
  await form.get('form').trigger('submit')
  expect(form.emitted('save')?.[0]?.[0]).toMatchObject({ kind: 'common', gameId: null })
  await form.get('[name=kind]').setValue('game')
  await form.get('form').trigger('submit')
  expect(form.emitted('save')).toHaveLength(1)
  expect(form.text()).toContain('选择已有游戏')
})
it('five versions prevent upload and tell the administrator to remove old versions', () => {
  const versions = Array.from({ length: 5 }, (_, index) => ({ id: String(index), version: String(index), fileId: String(index), uploadedAt: '2026-10-23T00:00:00Z', contentHash: 'abc', skillId: 's', manifest: {} }))
  const page = mount(SkillVersions, { props: { versions: versions as any } })
  expect(page.text()).toContain('先移除旧版本')
  expect(page.get('[data-publish]').attributes('disabled')).toBeDefined()
})
it('shows server authorization failures without reporting success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '需要管理员权限' }), { status: 403 })))
  const page = mount(LoginPage)
  await page.get('form').trigger('submit'); await flushPromises()
  expect(page.text()).toContain('需要管理员权限')
  expect(page.emitted('authenticated')).toBeUndefined()
})
it('game form submits immutable identifier and refreshes the list', async () => {
  const saved = { id: 'duckov', name: 'Duckov', description: 'desc' }
  const fetch = vi.fn().mockResolvedValueOnce(new Response('[]')).mockResolvedValueOnce(new Response(JSON.stringify(saved))).mockResolvedValueOnce(new Response(JSON.stringify([saved])))
  vi.stubGlobal('fetch', fetch)
  const page = mount(GamesPage); await flushPromises()
  await page.get('[name=id]').setValue('duckov'); await page.get('[name=name]').setValue('Duckov'); await page.get('[name=description]').setValue('desc')
  await page.get('form').trigger('submit'); await flushPromises()
  expect(fetch).toHaveBeenCalledWith('/api/games', expect.objectContaining({ method: 'POST', body: JSON.stringify(saved) }))
  expect(page.text()).toContain('Duckov')
})
it('editing a text file retains the other binary files', async () => {
  const original = { 'SKILL.md': strToU8('old'), 'icon.bin': new Uint8Array([0, 255]) }
  const editor = mount(SkillFiles, { props: { modelValue: original } })
  await editor.get('textarea').setValue('new')
  const changed = editor.emitted('update:modelValue')![0]![0] as typeof original
  expect(strFromU8(changed['SKILL.md'])).toBe('new')
  expect(changed['icon.bin']).toEqual(new Uint8Array([0, 255]))
})
it('folder packaging strips selected root and keeps SKILL.md at zip root', async () => {
  const file = new File(['skill'], 'SKILL.md'); Object.defineProperty(file, 'webkitRelativePath', { value: 'my-folder/SKILL.md' })
  expect(Object.keys(unzipSync(await folderZip([file])))).toEqual(['SKILL.md'])
})
