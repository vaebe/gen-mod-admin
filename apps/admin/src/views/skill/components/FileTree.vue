<script setup lang="ts">
import { shallowRef } from "vue";
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileCode2, FileText } from "@lucide/vue";
import type { FileNode } from "@/utils/skill-files";

defineProps<{ nodes: FileNode[]; selected: string; depth?: number; busy?: boolean }>();
const emit = defineEmits<{ select: [path: string] }>();
const collapsed = shallowRef<string[]>([]);
function toggle(path: string): void {
  collapsed.value = collapsed.value.includes(path)
    ? collapsed.value.filter((item) => item !== path)
    : [...collapsed.value, path];
}
</script>

<template>
  <ul class="min-w-0" :aria-label="depth ? undefined : '包内文件'">
    <li v-for="node in nodes" :key="node.path">
      <button
        type="button"
        class="tree-row"
        :class="{ active: selected === node.path }"
        :style="{ paddingLeft: `${12 + (depth || 0) * 14}px` }"
        :disabled="busy"
        :title="node.path"
        :aria-label="node.path"
        :aria-expanded="node.children ? !collapsed.includes(node.path) : undefined"
        :aria-current="selected === node.path ? 'true' : undefined"
        @click="node.children ? toggle(node.path) : emit('select', node.path)"
      >
        <template v-if="node.children"
          ><ChevronRight v-if="collapsed.includes(node.path)" :size="13" /><ChevronDown
            v-else
            :size="13" /><Folder
            v-if="collapsed.includes(node.path)"
            :size="15"
            class="text-amber-700" /><FolderOpen v-else :size="15" class="text-amber-700"
        /></template>
        <template v-else
          ><span class="w-3 shrink-0" /><FileText
            v-if="node.name.toLowerCase().endsWith('.md')"
            :size="15"
            class="text-primary" /><FileCode2 v-else :size="15" class="text-slate-500" /></template
        ><span class="truncate">{{ node.name }}</span>
      </button>
      <FileTree
        v-if="node.children && !collapsed.includes(node.path)"
        :nodes="node.children"
        :selected="selected"
        :depth="(depth || 0) + 1"
        :busy="busy"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>

<style scoped>
.tree-row {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 6px;
  padding-block: 7px;
  padding-right: 12px;
  text-align: left;
  font-size: 12px;
  color: var(--muted-foreground);
}
.tree-row:hover {
  background: var(--muted);
}
.tree-row.active {
  background: var(--accent);
  color: var(--primary);
  font-weight: 500;
}
.tree-row:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: -2px;
}
.tree-row :deep(svg) {
  flex-shrink: 0;
}
</style>
