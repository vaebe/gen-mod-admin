<script setup lang="ts">
import { shallowRef } from 'vue'
import type { SkillVersionRecord } from '../../types'
defineProps<{ versions: SkillVersionRecord[]; busy?: boolean }>()
const emit = defineEmits<{ publish: [version: string]; remove: [version: SkillVersionRecord]; download: [version: SkillVersionRecord]; edit: [version: SkillVersionRecord] }>()
const version = shallowRef('')
</script>
<template>
  <section class="stack">
    <div class="section-heading"><h3>已发布版本</h3><span class="badge">{{ versions.length }} / 5</span></div>
    <p v-if="versions.length >= 5" class="notice">已达 5 个版本，请先移除旧版本。</p>
    <p v-if="!versions.length" class="muted">尚无版本，桌面端暂无可确认内容。</p>
    <article v-for="item in versions" :key="item.id" class="version-row">
      <div><strong class="mono">{{ item.version }}</strong><small>{{ new Date(item.uploadedAt).toLocaleString() }}</small><small class="mono">{{ item.contentHash.slice(0, 16) }}</small></div>
      <div class="actions"><button :disabled="busy" @click="emit('edit', item)">编辑文件</button><button :disabled="busy" @click="emit('download', item)">下载</button><button class="danger" :disabled="busy" @click="emit('remove', item)">移除</button></div>
    </article>
    <form class="actions" @submit.prevent="emit('publish', version)"><label>新版本号<input v-model="version" required /></label><button data-publish class="primary" :disabled="versions.length >= 5 || busy">发布新版本</button></form>
  </section>
</template>
