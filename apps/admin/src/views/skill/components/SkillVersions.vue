<script setup lang="ts">
import { computed } from "vue";
import type { SkillVersionRecord } from "@/types";

const { versions, busy = false } = defineProps<{
  versions: SkillVersionRecord[];
  busy?: boolean;
}>();
const emit = defineEmits<{
  publish: [version: string];
  remove: [version: SkillVersionRecord];
  download: [version: SkillVersionRecord];
  edit: [version: SkillVersionRecord];
}>();
const version = defineModel<string>("version", { default: "" });
const duplicate = computed(() => versions.some((item) => item.version === version.value));

function publish(): void {
  if (busy || versions.length >= 5 || duplicate.value || !version.value.trim()) {
    return;
  }
  emit("publish", version.value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}
</script>

<template>
  <section class="stack">
    <div class="section-heading">
      <h3>已发布版本</h3>
      <span class="badge">{{ versions.length }} / 5</span>
    </div>
    <p v-if="versions.length >= 5" class="notice">已达 5 个版本，请先移除旧版本。</p>
    <p v-if="!versions.length" class="muted">尚无版本，桌面端暂无可确认内容。</p>
    <article v-for="item in versions" :key="item.id" class="version-row">
      <div>
        <strong class="mono">{{ item.version }}</strong>
        <small>{{ formatDate(item.uploadedAt) }}</small>
        <small class="mono" :title="item.contentHash">{{ item.contentHash.slice(0, 16) }}</small>
      </div>
      <div class="actions">
        <button type="button" :disabled="busy" @click="emit('edit', item)">编辑文件</button>
        <button type="button" :disabled="busy" @click="emit('download', item)">下载</button>
        <button type="button" class="danger" :disabled="busy" @click="emit('remove', item)">
          移除
        </button>
      </div>
    </article>
    <form class="stack" @submit.prevent="publish">
      <div class="actions">
        <label>新版本号<input v-model="version" required :disabled="busy" /></label>
        <button data-publish class="primary" :disabled="versions.length >= 5 || busy || duplicate">
          发布新版本
        </button>
      </div>
      <p v-if="duplicate" role="alert" class="error">版本号已存在；内容变更请提高版本号。</p>
    </form>
  </section>
</template>
