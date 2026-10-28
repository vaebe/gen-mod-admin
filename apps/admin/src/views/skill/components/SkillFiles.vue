<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, watch } from "vue";
import { strToU8 } from "fflate";
import {
  FilePlus2,
  Pencil,
  Trash2,
  Download,
  Code2,
  Eye,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Files,
} from "@lucide/vue";
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
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  addFile,
  buildFileTree,
  fileText,
  renameFile,
  type PackageFiles,
} from "@/utils/skill-files";
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
const pathDialog = shallowRef(false);
const renaming = shallowRef(false);
const newPath = shallowRef("");
const error = shallowRef("");
const confirmation = useConfirmation();
const names = computed(() => Object.keys(files.value).sort());
const tree = computed(() => buildFileTree(names.value));
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
function openPathDialog(rename: boolean): void {
  renaming.value = rename;
  newPath.value = rename ? selected.value : "";
  error.value = "";
  pathDialog.value = true;
}
function submitPath(): void {
  error.value = "";
  try {
    files.value = renaming.value
      ? renameFile(files.value, selected.value, newPath.value)
      : addFile(files.value, newPath.value);
    select(newPath.value.trim());
    pathDialog.value = false;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "文件操作失败";
  }
}
async function remove(): Promise<void> {
  const path = selected.value;
  if (
    !(await confirmation.ask({
      title: "从当前编辑内容中删除文件？",
      description: `将删除 ${path}，已发布版本不受影响。`,
      action: "删除文件",
      destructive: true,
    }))
  ) {
    return;
  }
  const next = { ...files.value };
  delete next[path];
  files.value = next;
}
function downloadFile(): void {
  const bytes = files.value[selected.value];
  if (!bytes) {
    return;
  }
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer]));
  const link = document.createElement("a");
  link.href = url;
  link.download = selected.value.split("/").slice(-1)[0] || "file";
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
        @click="treeVisible = !treeVisible"
        ><PanelLeftClose v-if="treeVisible" :size="15" /><PanelLeftOpen v-else :size="15" /></Button
      ><span class="mr-auto text-xs font-medium">文件工作区</span
      ><span class="text-xs text-muted-foreground">{{ names.length }} 个文件</span
      ><Button variant="ghost" size="sm" :disabled="busy" @click="openPathDialog(false)"
        ><FilePlus2 :size="14" />新建文件</Button
      >
    </div>
    <ResizablePanelGroup direction="horizontal" class="file-panels">
      <ResizablePanel
        v-if="treeVisible"
        :default-size="25"
        :min-size="15"
        :max-size="50"
        class="file-tree-panel"
      >
        <div class="flex h-9 items-center gap-2 px-3 text-[11px] font-medium text-muted-foreground">
          <Files :size="13" />资源管理器
        </div>
        <FileTree :nodes="tree" :selected="selected" :busy="busy" @select="select" />
        <p v-if="!names.length" class="p-4 text-xs leading-6 text-muted-foreground">
          新建 SKILL.md，或导入已有文件开始编辑。
        </p>
      </ResizablePanel>
      <ResizableHandle v-if="treeVisible" />
      <ResizablePanel :default-size="75" :min-size="35" class="min-w-0 bg-card">
        <div class="flex h-full min-w-0 flex-col">
          <div class="file-tabs" aria-label="已打开文件">
            <div
              v-for="path in openFiles"
              :key="path"
              class="file-tab"
              :class="{ active: selected === path }"
            >
              <button
                type="button"
                class="truncate px-3 py-2.5 text-xs"
                :aria-label="`打开 ${path}`"
                :aria-pressed="selected === path"
                @click="select(path)"
              >
                {{ path.split("/").slice(-1)[0] }}</button
              ><button
                type="button"
                class="mr-2 rounded p-0.5 hover:bg-muted"
                :aria-label="`关闭 ${path}`"
                @click="closeTab(path)"
              >
                <X :size="12" />
              </button>
            </div>
          </div>
          <template v-if="selected && files[selected]">
            <div class="editor-toolbar">
              <span
                class="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground"
                :title="selected"
                >{{ selected }}</span
              ><Button
                v-if="isMarkdown && text !== null"
                variant="ghost"
                size="icon-sm"
                :aria-label="preview ? '切换到代码' : '预览 Markdown'"
                :title="preview ? '切换到代码' : '预览 Markdown'"
                @click="preview = !preview"
                ><Code2 v-if="preview" :size="14" /><Eye v-else :size="14" /></Button
              ><Button
                variant="ghost"
                size="icon-sm"
                title="重命名文件"
                aria-label="重命名文件"
                :disabled="busy"
                @click="openPathDialog(true)"
                ><Pencil :size="13" /></Button
              ><Button
                variant="ghost"
                size="icon-sm"
                title="下载当前文件"
                aria-label="下载当前文件"
                @click="downloadFile"
                ><Download :size="14" /></Button
              ><Button
                variant="ghost"
                size="icon-sm"
                class="text-muted-foreground hover:text-destructive"
                title="删除文件"
                aria-label="删除文件"
                :disabled="busy"
                @click="remove"
                ><Trash2 :size="14"
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
                <p>原始字节将完整保留，不进行文本转换。</p>
                <p class="font-mono text-xs">{{ files[selected]?.byteLength }} bytes</p>
                <Button variant="outline" size="sm" @click="downloadFile"
                  ><Download :size="14" />下载文件</Button
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
              ><span class="ml-auto">修改后需发布新版本</span>
            </div>
          </template>
          <div v-else class="empty h-full">
            <Files :size="36" :stroke-width="1.2" />
            <p>从左侧选择文件，或创建新文件。</p>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
    <Dialog v-model:open="pathDialog"
      ><DialogContent
        ><DialogHeader
          ><DialogTitle>{{ renaming ? "重命名文件" : "新建文件" }}</DialogTitle
          ><DialogDescription
            >支持任意文本与代码文件。使用 / 创建嵌套目录，例如
            scripts/build.ps1。</DialogDescription
          ></DialogHeader
        >
        <form class="grid gap-4" @submit.prevent="submitPath">
          <label class="field"
            >文件路径<Input
              v-model="newPath"
              aria-label="文件路径"
              placeholder="例如 references/guide.md"
              required
          /></label>
          <p v-if="error" role="alert" class="error">{{ error }}</p>
          <DialogFooter
            ><Button type="button" variant="outline" @click="pathDialog = false">取消</Button
            ><Button type="submit">{{ renaming ? "保存名称" : "创建文件" }}</Button></DialogFooter
          >
        </form></DialogContent
      ></Dialog
    >
    <ConfirmDialog :request="confirmation.request.value" @answer="confirmation.answer" />
  </section>
</template>

<style scoped>
.file-workspace {
  height: max(520px, calc(100dvh - 300px));
  min-height: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.file-toolbar {
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-bottom: 1px solid var(--border);
}
.file-panels {
  min-height: 0;
  flex: 1;
}
.file-tree-panel {
  overflow: auto;
  background: color-mix(in oklch, var(--muted), white 50%);
}
.file-tabs {
  display: flex;
  min-height: 37px;
  flex-shrink: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--border);
  background: var(--muted);
}
.file-tab {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  max-width: 200px;
  border-right: 1px solid var(--border);
  color: var(--muted-foreground);
}
.file-tab.active {
  color: var(--foreground);
  background: var(--card);
}
.editor-toolbar {
  display: flex;
  height: 38px;
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
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 10px;
  border-top: 1px solid var(--border);
}
</style>
