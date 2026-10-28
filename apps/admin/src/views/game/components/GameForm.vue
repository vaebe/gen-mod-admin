<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GameRecord } from "@/types";
const model = defineModel<GameRecord>({ required: true });
defineProps<{ editing: boolean; busy: boolean }>();
const emit = defineEmits<{ save: []; cancel: [] }>();
</script>
<template>
  <form class="grid gap-5" @submit.prevent="emit('save')">
    <fieldset class="grid gap-5" :disabled="busy">
      <label class="field"
        >游戏标识<Input
          v-model="model.id"
          name="id"
          :disabled="editing"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          maxlength="64"
          placeholder="例如 stardew-valley"
          required
        /><span class="field-hint">小写字母、数字和连字符，创建后不可更改。</span></label
      >
      <label class="field"
        >游戏名称<Input v-model="model.name" name="name" placeholder="游戏的显示名称" required
      /></label>
      <label class="field"
        >说明<Textarea
          v-model="model.description"
          name="description"
          placeholder="描述游戏与 MOD 支持范围"
          rows="3"
      /></label>
      <div class="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" @click="emit('cancel')">取消</Button
        ><Button type="submit">{{ busy ? "正在保存…" : "保存游戏" }}</Button>
      </div>
    </fieldset>
  </form>
</template>
