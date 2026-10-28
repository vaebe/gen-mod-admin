<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "@lucide/vue";
import type { SkillMetadataPayload } from "@/types";
const model = defineModel<SkillMetadataPayload>({ required: true });
const { createMode = false } = defineProps<{ createMode?: boolean }>();
const emit = defineEmits<{ save: [] }>();
const StringListInput = defineAsyncComponent(() => import("./StringListInput.vue"));
function updateInspectionFile(value: string | number): void {
  model.value = { ...model.value, inspectionFile: String(value) || null };
}
</script>
<template>
  <form class="grid gap-5" @submit.prevent="emit('save')">
    <label v-if="!createMode" class="field"
      >说明<Textarea v-model="model.description" required rows="3" /><span class="field-hint"
        >发布时需与 SKILL.md 中的 description 一致。</span
      ></label
    >
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
    <label class="field"
      >调查规则文件<Input
        :model-value="model.inspectionFile || ''"
        placeholder="可选，如 inspection.json"
        @update:model-value="updateInspectionFile"
    /></label>
    <template v-if="!createMode"
      ><Button type="submit" variant="outline" class="w-full"
        ><Save :size="14" />保存说明与清单</Button
      >
      <p class="field-hint">此操作只保存说明与清单。文件修改请通过“发布新版本”保存。</p></template
    >
  </form>
</template>
