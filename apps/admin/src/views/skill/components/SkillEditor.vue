<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import type { CatalogSkill } from "@/types";
import { useSkillEditor } from "../composables/useSkillEditor";

const { skill } = defineProps<{ skill: CatalogSkill }>();
const emit = defineEmits<{ changed: [] }>();
const SkillMetadataForm = defineAsyncComponent(() => import("./SkillMetadataForm.vue"));
const SkillFiles = defineAsyncComponent(() => import("./SkillFiles.vue"));
const SkillVersions = defineAsyncComponent(() => import("./SkillVersions.vue"));
const {
  metadata,
  files,
  version,
  busy,
  error,
  notice,
  saveMetadata,
  importFiles,
  publish,
  edit,
  download,
  remove,
} = useSkillEditor(
  () => skill,
  () => emit("changed"),
);

function selectFiles(event: Event, folder: boolean): void {
  const input = event.target as HTMLInputElement;
  const selected = Array.from(input.files ?? []);
  // 清空选择，允许修正同一文件后再次导入。
  input.value = "";
  if (selected.length) {
    void importFiles(selected, folder);
  }
}
</script>

<template>
  <section class="panel stack" :aria-busy="busy">
    <div class="section-heading">
      <div>
        <p class="eyebrow">{{ skill.kind === "game" ? skill.gameId : "COMMON" }}</p>
        <h2 class="mono">{{ skill.name }}</h2>
      </div>
      <span class="badge">{{ skill.kind === "game" ? "游戏 Skill" : "通用 Skill" }}</span>
    </div>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <fieldset class="stack" :disabled="busy">
      <SkillMetadataForm v-model="metadata" @save="saveMetadata" />
      <div class="field-grid">
        <label
          >导入 zip<input type="file" accept=".zip" @change="selectFiles($event, false)"
        /></label>
        <label
          >上传文件夹<input
            type="file"
            webkitdirectory
            multiple
            @change="selectFiles($event, true)"
        /></label>
      </div>
      <SkillFiles v-model="files" />
      <SkillVersions
        v-model:version="version"
        :versions="skill.versions"
        :busy="busy"
        @publish="publish"
        @edit="edit"
        @download="download"
        @remove="remove"
      />
    </fieldset>
  </section>
</template>
