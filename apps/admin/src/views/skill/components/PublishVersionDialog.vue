<script setup lang="ts">
import { computed } from "vue";
import { Upload } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SkillVersionRecord } from "@/types";

const { versions, busy, error } = defineProps<{
  versions: SkillVersionRecord[];
  busy: boolean;
  error: string;
}>();
const open = defineModel<boolean>("open", { required: true });
const version = defineModel<string>("version", { required: true });
const emit = defineEmits<{ publish: [version: string] }>();
const duplicate = computed(() => versions.some((item) => item.version === version.value));
function submit(): void {
  if (!busy && versions.length < 5 && !duplicate.value && version.value.trim()) {
    emit("publish", version.value);
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="!busy && (open = $event)"
    ><DialogContent
      :show-close-button="!busy"
      @interact-outside="busy && $event.preventDefault()"
      @escape-key-down="busy && $event.preventDefault()"
      ><DialogHeader
        ><DialogTitle>发布新版本</DialogTitle
        ><DialogDescription
          >当前的文件、说明与清单将一起发布。已发布版本内容不可覆盖。</DialogDescription
        ></DialogHeader
      >
      <form class="grid gap-4" @submit.prevent="submit">
        <label class="field"
          >新版本号<Input v-model="version" required :disabled="busy" placeholder="例如 1.0.0"
        /></label>
        <p class="field-hint">
          已发布 {{ versions.length }} / 5 个版本。{{
            versions[0] ? `最近版本：${versions[0].version}` : "这是此 Skill 的首个版本。"
          }}
        </p>
        <p v-if="versions.length >= 5" class="error">已达 5 个版本，请先移除旧版本。</p>
        <p v-if="duplicate" role="alert" class="error">版本号已存在；内容变更请提高版本号。</p>
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <DialogFooter
          ><Button type="button" variant="outline" :disabled="busy" @click="open = false"
            >取消</Button
          ><Button
            data-publish
            type="submit"
            :disabled="busy || versions.length >= 5 || duplicate || !version.trim()"
            ><Upload :size="14" />{{ busy ? "正在发布…" : "确认发布" }}</Button
          ></DialogFooter
        >
      </form></DialogContent
    ></Dialog
  >
</template>
