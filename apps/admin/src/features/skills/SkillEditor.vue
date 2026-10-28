<script setup lang="ts">
import { computed, reactive, shallowRef, ref } from 'vue'
import { unzipSync, zipSync } from 'fflate'
import type { CatalogSkill, SkillVersionRecord } from '../../types'
import { api, response, message } from '../../lib/api'
import { folderZip, readBytes } from './zip'
import SkillFiles from './SkillFiles.vue'
import SkillVersions from './SkillVersions.vue'
const props = defineProps<{ skill: CatalogSkill }>()
const emit = defineEmits<{ changed: [] }>()
const metadata = reactive({ description: props.skill.description, dependencies: JSON.stringify(props.skill.dependencies), excludePaths: JSON.stringify(props.skill.excludePaths), requiredCommandScripts: JSON.stringify(props.skill.requiredCommandScripts), inspectionFile: props.skill.inspectionFile ?? '' })
const files = ref<Record<string, Uint8Array>>({}); const busy = shallowRef(false); const error = shallowRef(''); const notice = shallowRef('')
const versions = computed(() => props.skill.versions)
async function run(action: () => Promise<void>) { busy.value = true; error.value = ''; notice.value = ''; try { await action() } catch (cause) { error.value = message(cause) } finally { busy.value = false } }
function fields() {
  const result = { dependencies: JSON.parse(metadata.dependencies), excludePaths: JSON.parse(metadata.excludePaths), requiredCommandScripts: JSON.parse(metadata.requiredCommandScripts), inspectionFile: metadata.inspectionFile || null }
  for (const value of [result.dependencies, result.excludePaths, result.requiredCommandScripts]) { if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) { throw new Error('清单字段必须是字符串 JSON 数组') } }
  return result
}
function saveMetadata() { return run(async () => { await api(`/skills/${props.skill.id}`, 'PATCH', { description: metadata.description, ...fields() }); notice.value = '说明与清单已保存'; emit('changed') }) }
function importFiles(event: Event, folder: boolean) { const selected = Array.from((event.target as HTMLInputElement).files ?? []); if (!selected.length) { return }; void run(async () => { const archive = folder ? await folderZip(selected) : await readBytes(selected[0]!); const unpacked = unzipSync(archive); files.value = Object.fromEntries(Object.entries(unpacked).filter(([name]) => !name.endsWith('/'))); notice.value = '文件已载入编辑区，尚未发布' }) }
function publish(version: string) { return run(async () => {
  if (!files.value['SKILL.md']) { throw new Error('包根目录必须包含 SKILL.md') }
  const form = new FormData(); form.set('zip', new Blob([new Uint8Array(zipSync(files.value)).buffer]), 'skill.zip'); form.set('version', version)
  for (const [key, value] of Object.entries(fields())) { form.set(key, JSON.stringify(value)) }
  await api(`/skills/${props.skill.id}/versions`, 'POST', form); notice.value = '新版本已发布'; emit('changed')
}) }
function edit(version: SkillVersionRecord) { return run(async () => { const result = await response(`/files/${version.fileId}`); files.value = Object.fromEntries(Object.entries(unzipSync(new Uint8Array(await result.arrayBuffer()))).filter(([name]) => !name.endsWith('/'))); metadata.dependencies = JSON.stringify(version.manifest.dependencies); metadata.excludePaths = JSON.stringify(version.manifest.excludePaths); metadata.requiredCommandScripts = JSON.stringify(version.manifest.requiredCommandScripts); metadata.inspectionFile = version.manifest.inspectionFile ?? ''; notice.value = `已载入 ${version.version}，修改后请使用新版本号发布` }) }
function download(version: SkillVersionRecord) { return run(async () => { const file = await response(`/files/${version.fileId}`); const url = URL.createObjectURL(await file.blob()); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${props.skill.name}-${version.version}.zip`; anchor.click(); URL.revokeObjectURL(url) }) }
function remove(version: SkillVersionRecord) { if (confirm(`移除版本 ${version.version}？本机已经下载的文件将保留。`)) { void run(async () => { await api(`/skills/${props.skill.id}/versions/${version.id}`, 'DELETE'); emit('changed') }) } }
</script>
<template>
  <section class="panel stack"><div class="section-heading"><div><p class="eyebrow">{{ skill.kind === 'game' ? skill.gameId : 'COMMON' }}</p><h2 class="mono">{{ skill.name }}</h2></div><span class="badge">{{ skill.kind === 'game' ? '游戏 Skill' : '通用 Skill' }}</span></div>
    <p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <form class="stack" @submit.prevent="saveMetadata"><label>说明<textarea v-model="metadata.description" required /><small>必须与 SKILL.md frontmatter 的 description 一致</small></label>
      <div class="field-grid"><label>dependencies · JSON 数组<input v-model="metadata.dependencies" class="mono" /></label><label>excludePaths · JSON 数组<input v-model="metadata.excludePaths" class="mono" /></label><label>requiredCommandScripts · JSON 数组<input v-model="metadata.requiredCommandScripts" class="mono" /></label><label>inspectionFile · 可选相对路径<input v-model="metadata.inspectionFile" class="mono" /></label></div><button :disabled="busy">保存说明与清单</button>
    </form>
    <div class="field-grid"><label>导入 zip<input type="file" accept=".zip" :disabled="busy" @change="importFiles($event, false)" /></label><label>上传文件夹<input type="file" webkitdirectory multiple :disabled="busy" @change="importFiles($event, true)" /></label></div>
    <SkillFiles v-model="files" /><SkillVersions :versions="versions" :busy="busy" @publish="publish" @edit="edit" @download="download" @remove="remove" />
  </section>
</template>
