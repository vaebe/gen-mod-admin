<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, watch } from "vue";
import { strToU8 } from "fflate";
import {
  Download,
  Code2,
  Eye,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Files,
  FileCode2,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { fileText, isFolder, parentPath, type PackageFiles } from "@/utils/skill-files";
import { useConfirmation } from "@/composables/useConfirmation";

const files = defineModel<PackageFiles>({ required: true });
const { busy = false } = defineProps<{ busy?: boolean }>();
const CodeEditor = defineAsyncComponent(() => import("./CodeEditor.vue"));
const FileTree = defineAsyncComponent(() => import("./FileTree.vue"));
const MarkdownPreview = defineAsyncComponent(() => import("./MarkdownPreview.vue"));
const ConfirmDialog = defineAsyncComponent(() => import("@/components/ConfirmDialog.vue"));
const selected = shallowRef("SKILL.md");
const openFiles = shallowRef<string[]>(["SKILL.md"]);
const treeVisible = shallowRef(true);
const preview = shallowRef(false);
const confirmation = useConfirmation();
const names = computed(() =>
  Object.keys(files.value)
    .filter((path) => !path.endsWith("/"))
    .sort(),
);
const text = computed({
  get: () => (files.value[selected.value] ? fileText(files.value[selected.value]!) : null),
  set: (value) => {
    if (value !== null) {
      files.value = { ...files.value, [selected.value]: strToU8(value) };
    }
  },
});
const isMarkdown = computed(() => selected.value.toLowerCase().endsWith(".md"));
watch(
  names,
  (paths) => {
    openFiles.value = openFiles.value.filter((path) => paths.includes(path));
    if (!paths.includes(selected.value)) {
      selected.value = paths.includes("SKILL.md") ? "SKILL.md" : paths[0] || "";
    }
    if (selected.value && !openFiles.value.includes(selected.value)) {
      openFiles.value = [...openFiles.value, selected.value];
    }
  },
  { immediate: true },
);
function select(path: string): void {
  selected.value = path;
  if (!openFiles.value.includes(path)) {
    openFiles.value = [...openFiles.value, path];
  }
  preview.value = false;
}
function closeTab(path: string): void {
  openFiles.value = openFiles.value.filter((item) => item !== path);
  if (selected.value === path) {
    selected.value = openFiles.value.slice(-1)[0] || "";
  }
}
function relocated(source: string, target: string): void {
  const remap = (path: string) =>
    path === source || path.startsWith(source + "/") ? target + path.slice(source.length) : path;
  openFiles.value = openFiles.value.map(remap);
  selected.value = remap(selected.value);
}
async function remove(path: string): Promise<void> {
  const folder = isFolder(files.value, path);
  const count = Object.keys(files.value).filter(
    (item) => !item.endsWith("/") && item.startsWith(path + "/"),
  ).length;
  if (
    !(await confirmation.ask({
      title: folder ? "删除文件夹？" : "删除文件？",
      description: folder
        ? "将删除 " + path + " 及其中的 " + count + " 个文件，已发布版本不受影响。"
        : "将从编辑区删除 " + path + "，已发布版本不受影响。",
      action: folder ? "删除文件夹" : "删除文件",
      destructive: true,
    }))
  ) {
    return;
  }
  const remaining = Object.fromEntries(
    Object.entries(files.value).filter(([item]) => item !== path && !item.startsWith(path + "/")),
  );
  const parent = parentPath(path);
  if (parent && !isFolder(remaining, parent)) {
    remaining[`${parent}/`] = new Uint8Array();
  }
  files.value = remaining;
}
function downloadFile(path = selected.value): void {
  const bytes = files.value[path];
  if (!bytes) {
    return;
  }
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer]));
  const link = document.createElement("a");
  link.href = url;
  link.download = path.split("/").slice(-1)[0] || "file";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="file-workspace" aria-label="Skill 文件编辑器">
    <div class="file-toolbar">
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="treeVisible ? '隐藏文件树' : '显示文件树'"
        :title="treeVisible ? '隐藏文件树' : '显示文件树'"
        @click="treeVisible = !treeVisible"
        ><PanelLeftClose v-if="treeVisible" /><PanelLeftOpen v-else
      /></Button>
      <span class="mr-3 text-xs font-medium">内容文件</span>
      <slot name="toolbar" />
      <span class="ml-auto text-xs text-muted-foreground">{{ names.length }} 个文件</span>
    </div>
    <ResizablePanelGroup direction="horizontal" class="file-panels">
      <ResizablePanel
        v-if="treeVisible"
        :default-size="22"
        :min-size="17"
        :max-size="45"
        class="file-tree-panel"
      >
        <FileTree
          v-model="files"
          :selected="selected"
          :busy="busy"
          @select="select"
          @moved="relocated"
          @remove="remove"
          @download="downloadFile"
        />
      </ResizablePanel>
      <ResizableHandle v-if="treeVisible" />
      <ResizablePanel :default-size="78" :min-size="35" class="min-w-0 bg-card">
        <div class="flex h-full min-w-0 flex-col">
          <div class="file-tabs" aria-label="已打开文件">
            <div
              v-for="path in openFiles"
              :key="path"
              class="file-tab"
              :class="{ active: selected === path }"
            >
              <Button
                variant="ghost"
                size="sm"
                class="tab-label"
                :aria-label="'打开 ' + path"
                :aria-pressed="selected === path"
                :title="path"
                @click="select(path)"
                ><FileCode2 /><span class="truncate">{{
                  path.split("/").slice(-1)[0]
                }}</span></Button
              >
              <Button
                variant="ghost"
                size="icon-xs"
                :aria-label="'关闭 ' + path"
                @click="closeTab(path)"
                ><X
              /></Button>
            </div>
          </div>
          <template v-if="selected && files[selected]">
            <div class="editor-toolbar">
              <span
                class="min-w-0 flex-1 truncate text-[11px] text-muted-foreground"
                :title="selected"
                >{{ selected }}</span
              >
              <Button
                v-if="isMarkdown && text !== null"
                variant="ghost"
                size="sm"
                :aria-pressed="preview"
                @click="preview = !preview"
                ><Code2 v-if="preview" /><Eye v-else />{{ preview ? "代码" : "预览" }}</Button
              >
              <Button
                variant="ghost"
                size="icon-sm"
                title="下载当前文件"
                aria-label="下载当前文件"
                @click="downloadFile()"
                ><Download
              /></Button>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <CodeEditor
                v-if="text !== null"
                v-show="!preview || !isMarkdown"
                v-model="text"
                :path="selected"
                :readonly="busy"
              />
              <MarkdownPreview v-if="preview && isMarkdown && text !== null" :text="text" />
              <div v-else-if="text === null" class="empty h-full">
                <Files :size="32" />
                <h3 class="text-foreground">二进制文件</h3>
                <p>原始内容将完整保留。</p>
                <p class="text-xs">{{ files[selected]?.byteLength }} bytes</p>
                <Button variant="outline" size="sm" @click="downloadFile()"
                  ><Download />下载文件</Button
                >
              </div>
            </div>
            <div class="editor-status">
              <span>{{
                text === null
                  ? "二进制"
                  : isMarkdown
                    ? "Markdown"
                    : selected.split(".").slice(-1)[0]?.toUpperCase() || "文本"
              }}</span
              ><span v-if="text !== null">UTF-8</span
              ><span class="ml-auto">文件修改通过发布新版本保存</span>
            </div>
          </template>
          <div v-else class="empty h-full">
            <Files :size="36" :stroke-width="1.2" />
            <p>从资源管理器打开文件，开始编辑。</p>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
    <ConfirmDialog :request="confirmation.request.value" @answer="confirmation.answer" />
  </section>
</template>

<style scoped>
.file-workspace {
  height: max(520px, calc(100dvh - 150px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.file-toolbar {
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-bottom: 1px solid var(--border);
}
.file-panels {
  min-height: 0;
  flex: 1;
}
.file-tree-panel {
  background: var(--editor-sidebar);
}
.file-tabs {
  display: flex;
  min-height: 39px;
  flex-shrink: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--border);
  background: var(--editor-toolbar);
}
.file-tab {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  max-width: 220px;
  padding-right: 6px;
  border-right: 1px solid var(--border);
  color: var(--muted-foreground);
}
.file-tab.active {
  color: var(--foreground);
  background: var(--card);
  box-shadow: inset 0 2px var(--primary);
}
.tab-label {
  height: 38px;
  min-width: 0;
  border-radius: 0;
  font-size: 12px;
  font-weight: 400;
}
.editor-toolbar {
  display: flex;
  height: 34px;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
}
.editor-status {
  display: flex;
  flex-shrink: 0;
  gap: 14px;
  padding: 6px 12px;
  background: var(--editor-status);
  color: var(--muted-foreground);
  font-size: 11px;
  border-top: 1px solid var(--border);
}
</style>
