<script setup lang="ts">
import { Plus, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const model = defineModel<string[]>({ required: true });
defineProps<{ label: string; placeholder: string }>();
function update(index: number, value: string | number): void {
  model.value = model.value.map((entry, position) => (index === position ? String(value) : entry));
}
function remove(index: number): void {
  model.value = model.value.filter((_, position) => index !== position);
}
</script>
<template>
  <fieldset class="grid gap-2">
    <legend class="mb-2 text-xs font-medium">{{ label }}</legend>
    <div v-for="(value, index) in model" :key="index" class="flex gap-1">
      <Input
        :model-value="value"
        :aria-label="`${label} ${index + 1}`"
        :placeholder="placeholder"
        required
        @update:model-value="update(index, $event)"
      /><Button
        type="button"
        variant="ghost"
        size="icon"
        class="shrink-0 text-muted-foreground"
        :aria-label="`移除${label} ${index + 1}`"
        @click="remove(index)"
        ><X :size="14"
      /></Button>
    </div>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class="w-fit justify-start px-0 text-xs text-muted-foreground"
      @click="model = [...model, '']"
      ><Plus :size="13" />添加{{ label }}</Button
    >
  </fieldset>
</template>
