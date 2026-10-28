<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import type { SkillMetadataPayload } from "@/types";

const model = defineModel<SkillMetadataPayload>({ required: true });
const emit = defineEmits<{ save: [] }>();
const StringListInput = defineAsyncComponent(() => import("./StringListInput.vue"));

function updateInspectionFile(event: Event): void {
  model.value.inspectionFile = (event.target as HTMLInputElement).value || null;
}
</script>

<template>
  <form class="stack" @submit.prevent="emit('save')">
    <label>
      说明
      <textarea v-model="model.description" required />
      <small>发布时必须与 SKILL.md 中的 description 一致。</small>
    </label>
    <div class="field-grid">
      <StringListInput
        v-model="model.dependencies"
        label="依赖 Skill"
        placeholder="例如 mod-workflow"
      />
      <StringListInput v-model="model.excludePaths" label="排除路径" placeholder="例如 build" />
      <StringListInput
        v-model="model.requiredCommandScripts"
        label="必需脚本"
        placeholder="例如 scripts/build.ps1"
      />
      <label>
        调查规则文件
        <input
          :value="model.inspectionFile ?? ''"
          placeholder="可选，例如 inspection.json"
          @input="updateInspectionFile"
        />
      </label>
    </div>
    <button>保存说明与清单</button>
    <small
      >仅修改清单可单独保存；修改文件后请在下方填写新版本号，说明、清单和文件将一起发布。</small
    >
  </form>
</template>
