<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import type { editor } from "monaco-editor";
import { Button } from "@/components/ui/button";

const props = defineProps<{ path: string; readonly?: boolean }>();
const text = defineModel<string>({ required: true });
const host = useTemplateRef<HTMLDivElement>("host");
const loading = shallowRef(true);
const error = shallowRef("");
let instance: editor.IStandaloneCodeEditor | undefined;
let api: typeof import("monaco-editor") | undefined;
let disposed = false;
const models = new Map<string, editor.ITextModel>();
const positions = new Map<string, editor.ICodeEditorViewState | null>();
const namespace = crypto.randomUUID();
let activePath = "";

function selectModel(): void {
  if (!api || !instance) {
    return;
  }
  if (activePath) {
    positions.set(activePath, instance.saveViewState());
  }
  activePath = props.path;
  let model = models.get(activePath);
  if (!model) {
    model = api.editor.createModel(
      text.value,
      undefined,
      api.Uri.parse(`inmemory://${namespace}/${activePath}`),
    );
    models.set(activePath, model);
  } else if (model.getValue(undefined, true) !== text.value) {
    model.setValue(text.value);
  }
  instance.setModel(model);
  instance.updateOptions({ ariaLabel: `编辑 ${props.path}` });
  const position = positions.get(activePath);
  if (position) {
    instance.restoreViewState(position);
  }
}

async function loadEditor(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    api = (await import("@/lib/monaco")).monaco;
    if (disposed || !host.value) {
      return;
    }
    instance = api.editor.create(host.value, {
      model: null,
      theme: "vs",
      automaticLayout: true,
      fontSize: 13,
      fontFamily: '"Cascadia Code", Consolas, monospace',
      lineHeight: 22,
      minimap: { enabled: false },
      padding: { top: 16, bottom: 16 },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      tabSize: 2,
      readOnly: props.readonly,
      accessibilitySupport: "on",
      renderLineHighlight: "gutter",
    });
    selectModel();
    instance.onDidChangeModelContent(() => {
      const model = instance?.getModel();
      if (model && activePath === props.path) {
        text.value = model.getValue(undefined, true);
      }
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "编辑器加载失败";
  } finally {
    loading.value = false;
  }
}
onMounted(loadEditor);

watch(() => props.path, selectModel, { flush: "post" });
watch(text, (value) => {
  const model = instance?.getModel();
  // 切换文件由 selectModel 处理，避免把新文件文本写入上一个 model。
  if (activePath === props.path && model && model.getValue(undefined, true) !== value) {
    model.setValue(value);
  }
});
watch(
  () => props.readonly,
  (value) => instance?.updateOptions({ readOnly: value }),
);
onBeforeUnmount(() => {
  disposed = true;
  instance?.dispose();
  for (const model of models.values()) {
    model.dispose();
  }
});
</script>

<template>
  <div class="relative h-full min-h-80">
    <div ref="host" class="h-full min-h-80" />
    <div
      v-if="loading"
      role="status"
      class="absolute inset-0 grid place-items-center bg-card text-xs text-muted-foreground"
    >
      正在加载代码编辑器…
    </div>
    <div v-if="error" role="alert" class="absolute inset-0 grid content-center gap-3 bg-card p-6">
      <p class="text-destructive">{{ error }}</p>
      <p class="text-xs text-muted-foreground">文件内容仍然保留，可以重新加载编辑器。</p>
      <Button variant="outline" class="w-fit" @click="loadEditor">重新加载编辑器</Button>
    </div>
  </div>
</template>
