<script setup lang="ts">
const model = defineModel<string[]>({ required: true });
defineProps<{ label: string; placeholder: string }>();

function update(index: number, event: Event): void {
  const next = [...model.value];
  next[index] = (event.target as HTMLInputElement).value;
  model.value = next;
}

function remove(index: number): void {
  model.value = model.value.filter((_, itemIndex) => itemIndex !== index);
}
</script>

<template>
  <fieldset class="stack string-list">
    <legend>{{ label }}</legend>
    <p v-if="!model.length" class="muted">未配置</p>
    <div v-for="(value, index) in model" :key="index" class="actions">
      <input
        :value="value"
        :aria-label="`${label} ${index + 1}`"
        :placeholder="placeholder"
        required
        @input="update(index, $event)"
      />
      <button type="button" :aria-label="`移除${label} ${index + 1}`" @click="remove(index)">
        移除
      </button>
    </div>
    <button type="button" @click="model = [...model, '']">添加{{ label }}</button>
  </fieldset>
</template>
