<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { strToU8 } from "fflate";

const files = defineModel<Record<string, Uint8Array>>({ required: true });
const selected = ref("SKILL.md");
const newPath = ref("");
const error = ref("");
const names = computed(() => Object.keys(files.value).sort());
const text = computed(() => {
  const bytes = files.value[selected.value];
  if (!bytes || bytes.includes(0)) {
    return null;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
});

watch(names, (paths) => {
  if (!paths.includes(selected.value)) {
    selected.value = paths[0] ?? "SKILL.md";
  }
});

function update(event: Event): void {
  files.value = {
    ...files.value,
    [selected.value]: strToU8((event.target as HTMLTextAreaElement).value),
  };
}

function add(): void {
  const path = newPath.value.trim();
  error.value = "";
  if (
    !path ||
    /[:\\\\]/.test(path) ||
    path.split("/").some((value) => !value || value === "." || value === "..") ||
    files.value[path]
  ) {
    error.value = "请填写未占用的包内相对路径";
    return;
  }
  files.value = { ...files.value, [path]: new Uint8Array() };
  selected.value = path;
  newPath.value = "";
}

function remove(): void {
  const remaining = { ...files.value };
  delete remaining[selected.value];
  files.value = remaining;
  selected.value = Object.keys(remaining).sort()[0] ?? "SKILL.md";
}
</script>

<template>
  <section class="stack">
    <h3>文件内容</h3>
    <p v-if="!names.length" class="muted">上传文件夹、导入 zip，或创建 SKILL.md 开始编辑。</p>
    <label v-if="names.length">
      包内文件
      <select v-model="selected">
        <option v-for="name in names" :key="name" :value="name">{{ name }}</option>
      </select>
    </label>
    <textarea
      v-if="text !== null"
      class="code-editor mono"
      :aria-label="`编辑 ${selected}`"
      :value="text"
      spellcheck="false"
      @input="update"
    />
    <p v-else-if="names.length" class="muted">二进制文件会按原字节保留。</p>
    <button v-if="names.length" type="button" class="danger" @click="remove">删除文件</button>
    <div class="actions">
      <input
        v-model="newPath"
        aria-label="新增文件路径"
        placeholder="例如 SKILL.md 或 scripts/build.ps1"
        @keydown.enter.prevent="add"
      />
      <button type="button" @click="add">新增文本文件</button>
    </div>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
  </section>
</template>
