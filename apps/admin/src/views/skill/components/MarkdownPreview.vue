<script setup lang="ts">
import { computed } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
const props = defineProps<{ text: string }>();
const frontmatter = computed(() => props.text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]);
const body = computed(() => props.text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, ""));
// 禁止包内 HTML/脚本和远端图片，预览不执行包内代码或触发外部资源请求。
const rendered = computed(() =>
  DOMPurify.sanitize(marked.parse(body.value, { async: false }), {
    FORBID_TAGS: ["img", "video", "audio", "iframe", "style", "form", "input"],
  }),
);
</script>

<template>
  <article class="markdown-preview">
    <details v-if="frontmatter" class="mb-5 rounded-md border p-3 text-xs text-muted-foreground">
      <summary class="cursor-pointer">文件元数据</summary>
      <pre>{{ frontmatter }}</pre>
    </details>
    <div v-html="rendered" @click.prevent />
  </article>
</template>

<style scoped>
.markdown-preview {
  height: 100%;
  overflow: auto;
  padding: 24px 32px;
  line-height: 1.8;
  font-size: 14px;
  overflow-wrap: anywhere;
}
.markdown-preview :deep(h1) {
  font-size: 24px;
  margin: 20px 0 12px;
}
.markdown-preview :deep(h2) {
  font-size: 19px;
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.markdown-preview :deep(h3) {
  font-size: 16px;
  margin: 16px 0 8px;
}
.markdown-preview :deep(p),
.markdown-preview :deep(pre),
.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  margin: 12px 0;
}
.markdown-preview :deep(ul) {
  list-style: disc;
  padding-left: 22px;
}
.markdown-preview :deep(ol) {
  list-style: decimal;
  padding-left: 22px;
}
.markdown-preview :deep(pre) {
  overflow: auto;
  padding: 16px;
  border-radius: 6px;
  background: var(--muted);
  font-family: var(--font-mono);
  font-size: 12px;
}
.markdown-preview :deep(code) {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--muted);
  padding: 2px 4px;
  border-radius: 3px;
}
.markdown-preview :deep(a) {
  color: var(--primary);
  text-decoration: underline;
}
.markdown-preview :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 16px;
  background: var(--muted);
  color: var(--muted-foreground);
}
.markdown-preview :deep(table) {
  display: block;
  overflow: auto;
  border-collapse: collapse;
}
.markdown-preview :deep(td),
.markdown-preview :deep(th) {
  border: 1px solid var(--border);
  padding: 6px 12px;
}
</style>
