<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from "vue";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode2,
  FileText,
  FilePlus2,
  FolderPlus,
  Pencil,
  Scissors,
  ClipboardPaste,
  Trash2,
  ChevronsDownUp,
  Download,
} from "@lucide/vue";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { isFolder, parentPath, type PackageFiles } from "@/utils/skill-files";
import { useFileExplorer, type ExplorerAction } from "../composables/useFileExplorer";

const files = defineModel<PackageFiles>({ required: true });
const explorerRoot = useTemplateRef<HTMLDivElement>("explorerRoot");
const props = defineProps<{ selected: string; busy?: boolean }>();
const emit = defineEmits<{
  select: [path: string];
  moved: [source: string, target: string];
  remove: [path: string];
  download: [path: string];
}>();
const {
  focused,
  collapsed,
  cutPath,
  draft,
  error,
  dropTarget,
  rows,
  toggle,
  begin,
  cancel,
  move,
  submit,
  destination,
} = useFileExplorer(files, (source, target) => emit("moved", source, target));
const vFocus = {
  mounted: (element: HTMLInputElement) => {
    element.focus();
    element.select();
  },
};
watch(
  () => props.selected,
  (path) => {
    focused.value = path;
    collapsed.value = collapsed.value.filter((folder) => !path.startsWith(folder + "/"));
  },
);
function activate(path: string): void {
  focused.value = path;
  if (isFolder(files.value, path)) {
    toggle(path);
  } else {
    emit("select", path);
  }
}
function action(kind: ExplorerAction, path = focused.value): void {
  if (props.busy) {
    return;
  }
  focused.value = path;
  if (kind === "file" || kind === "folder") {
    begin(kind === "folder", "", path);
  }
  if (kind === "rename" && path) {
    begin(isFolder(files.value, path), path);
  }
  if (kind === "cut" && path) {
    cutPath.value = path;
  }
  if (kind === "paste" && cutPath.value) {
    move(cutPath.value, destination(path));
  }
  if (kind === "remove" && path) {
    emit("remove", path);
  }
}
function submitName(): void {
  if (props.busy) {
    return;
  }
  const path = submit();
  if (path) {
    emit("select", path);
  }
  if (!draft.value && explorerRoot.value) {
    void focusRow(explorerRoot.value, focused.value);
  }
}
function cancelName(): void {
  cancel();
  if (explorerRoot.value) {
    void focusRow(explorerRoot.value, focused.value);
  }
}
function drag(event: DragEvent, path: string): void {
  if (props.busy || draft.value || !event.dataTransfer) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData("application/x-genmod-path", path);
  event.dataTransfer.effectAllowed = "move";
}
function over(event: DragEvent, path: string): void {
  if (props.busy || !event.dataTransfer?.types.includes("application/x-genmod-path")) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  dropTarget.value = destination(path);
}
function drop(event: DragEvent, path: string): void {
  dropTarget.value = null;
  const source = event.dataTransfer?.getData("application/x-genmod-path");
  if (!props.busy && source) {
    event.preventDefault();
    move(source, destination(path));
  }
}
async function focusRow(root: HTMLElement, path: string): Promise<void> {
  focused.value = path;
  await nextTick();
  Array.from(root.querySelectorAll<HTMLElement>("[data-tree-path]"))
    .find((item) => item.dataset.treePath === path)
    ?.focus();
}
function keyboard(event: KeyboardEvent): void {
  if (event.target instanceof HTMLInputElement || props.busy) {
    return;
  }
  const path = focused.value;
  if (
    event.key === "F2" ||
    event.key === "Delete" ||
    ((event.ctrlKey || event.metaKey) && ["x", "v"].includes(event.key.toLowerCase()))
  ) {
    event.preventDefault();
    action(
      event.key === "F2"
        ? "rename"
        : event.key === "Delete"
          ? "remove"
          : event.key.toLowerCase() === "x"
            ? "cut"
            : "paste",
    );
    return;
  }
  if (event.key === "Escape") {
    cutPath.value = "";
    return;
  }
  if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    return;
  }
  event.preventDefault();
  const root = event.currentTarget as HTMLElement;
  const visible = rows.value.filter((row) => !row.draft);
  const index = visible.findIndex((row) => row.path === path);
  if (event.key === "ArrowRight" && isFolder(files.value, path)) {
    if (collapsed.value.includes(path)) {
      toggle(path);
    } else if (visible[index + 1]?.path.startsWith(path + "/")) {
      void focusRow(root, visible[index + 1]!.path);
    }
  } else if (event.key === "ArrowLeft") {
    if (isFolder(files.value, path) && !collapsed.value.includes(path)) {
      toggle(path);
    } else {
      void focusRow(root, parentPath(path));
    }
  } else if (event.key !== "ArrowRight") {
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? visible.length - 1
          : Math.max(0, Math.min(visible.length - 1, index + (event.key === "ArrowUp" ? -1 : 1)));
    if (visible[next]) {
      void focusRow(root, visible[next]!.path);
    }
  }
}
</script>

<template>
  <div ref="explorerRoot" class="explorer" @keydown="keyboard" @dragend="dropTarget = null">
    <TooltipProvider :delay-duration="350">
      <div class="explorer-heading">
        <span class="mr-auto font-medium">资源管理器</span>
        <Tooltip
          ><TooltipTrigger as-child
            ><Button
              variant="ghost"
              size="icon-xs"
              title="新建文件"
              aria-label="新建文件"
              :disabled="busy"
              @click="action('file')"
              ><FilePlus2 /></Button></TooltipTrigger
          ><TooltipContent>新建文件</TooltipContent></Tooltip
        >
        <Tooltip
          ><TooltipTrigger as-child
            ><Button
              variant="ghost"
              size="icon-xs"
              title="新建文件夹"
              aria-label="新建文件夹"
              :disabled="busy"
              @click="action('folder')"
              ><FolderPlus /></Button></TooltipTrigger
          ><TooltipContent>新建文件夹</TooltipContent></Tooltip
        >
        <Tooltip
          ><TooltipTrigger as-child
            ><Button
              variant="ghost"
              size="icon-xs"
              title="折叠所有文件夹"
              aria-label="折叠所有文件夹"
              @click="collapsed = rows.filter((row) => row.children).map((row) => row.path)"
              ><ChevronsDownUp /></Button></TooltipTrigger
          ><TooltipContent>折叠所有文件夹</TooltipContent></Tooltip
        >
      </div></TooltipProvider
    >
    <ContextMenu>
      <ContextMenuTrigger as-child :disabled="busy">
        <div
          class="explorer-body"
          role="tree"
          aria-label="包内文件"
          @dragover.self="over($event, '')"
          @drop.self="drop($event, '')"
          @contextmenu.self="focused = ''"
        >
          <template v-for="row in rows" :key="row.path">
            <form
              v-if="row.draft || (draft?.rename && draft.source === row.path)"
              class="tree-edit"
              :style="{ paddingLeft: 12 + row.depth * 16 + 'px' }"
              @submit.prevent="submitName"
            >
              <Folder v-if="draft?.folder" :size="15" class="folder-icon" /><FilePlus2
                v-else
                :size="15"
              />
              <Input
                v-if="draft"
                v-focus
                :disabled="busy"
                :model-value="draft.name"
                :aria-label="draft.rename ? '新的名称' : draft.folder ? '文件夹名称' : '文件名称'"
                autocomplete="off"
                spellcheck="false"
                :aria-invalid="Boolean(error)"
                @update:model-value="
                  draft = { ...draft!, name: String($event) };
                  error = '';
                "
                @keydown.esc.prevent.stop="cancelName"
              />
              <Button type="button" variant="ghost" size="xs" @click="cancelName">取消</Button>
            </form>
            <ContextMenu v-else>
              <ContextMenuTrigger as-child :disabled="busy">
                <Button
                  variant="ghost"
                  class="tree-row"
                  role="treeitem"
                  :data-tree-path="row.path"
                  :class="{
                    active: focused === row.path,
                    cut: cutPath && (cutPath === row.path || row.path.startsWith(cutPath + '/')),
                    'drop-target': dropTarget === row.path,
                  }"
                  :style="{ paddingLeft: 12 + row.depth * 16 + 'px' }"
                  :tabindex="focused === row.path || (!focused && row === rows[0]) ? 0 : -1"
                  :aria-level="row.depth + 1"
                  :aria-expanded="row.children ? !collapsed.includes(row.path) : undefined"
                  :aria-selected="focused === row.path"
                  :title="row.path"
                  :disabled="busy"
                  :draggable="!busy && !draft"
                  @focus="focused = row.path"
                  @click="activate(row.path)"
                  @contextmenu.stop="focused = row.path"
                  @dragstart="drag($event, row.path)"
                  @dragover.stop="over($event, row.path)"
                  @dragleave="dropTarget = null"
                  @drop.stop="drop($event, row.path)"
                >
                  <template v-if="row.children"
                    ><ChevronRight v-if="collapsed.includes(row.path)" :size="12" /><ChevronDown
                      v-else
                      :size="12" /><Folder
                      v-if="collapsed.includes(row.path)"
                      class="folder-icon" /><FolderOpen v-else class="folder-icon"
                  /></template>
                  <template v-else
                    ><span class="size-3 shrink-0" /><FileText
                      v-if="row.name.toLowerCase().endsWith('.md')"
                      class="markdown-icon" /><FileCode2 v-else class="code-icon"
                  /></template>
                  <span class="truncate">{{ row.name }}</span>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent class="w-48">
                <ContextMenuGroup>
                  <ContextMenuItem @select="action('file', row.path)"
                    ><FilePlus2 />新建文件</ContextMenuItem
                  >
                  <ContextMenuItem @select="action('folder', row.path)"
                    ><FolderPlus />新建文件夹</ContextMenuItem
                  >
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <ContextMenuGroup>
                  <ContextMenuItem @select="action('rename', row.path)"
                    ><Pencil />重命名<ContextMenuShortcut>F2</ContextMenuShortcut></ContextMenuItem
                  >
                  <ContextMenuItem @select="action('cut', row.path)"
                    ><Scissors />剪切<ContextMenuShortcut
                      >Ctrl X</ContextMenuShortcut
                    ></ContextMenuItem
                  >
                  <ContextMenuItem :disabled="!cutPath" @select="action('paste', row.path)"
                    ><ClipboardPaste />粘贴<ContextMenuShortcut
                      >Ctrl V</ContextMenuShortcut
                    ></ContextMenuItem
                  >
                  <ContextMenuItem v-if="!row.children" @select="emit('download', row.path)"
                    ><Download />下载文件</ContextMenuItem
                  >
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <ContextMenuGroup
                  ><ContextMenuItem variant="destructive" @select="action('remove', row.path)"
                    ><Trash2 />删除<ContextMenuShortcut
                      >Delete</ContextMenuShortcut
                    ></ContextMenuItem
                  ></ContextMenuGroup
                >
              </ContextMenuContent>
            </ContextMenu>
          </template>
          <p v-if="!rows.length" class="px-4 py-8 text-xs leading-6 text-muted-foreground">
            使用上方按钮新建文件或文件夹。
          </p>
          <div
            class="root-target"
            :class="{ active: dropTarget === '' }"
            @dragover.stop="over($event, '')"
            @drop.stop="drop($event, '')"
            @contextmenu="focused = ''"
          >
            {{ dropTarget === "" ? "移动到根目录" : "右键可新建 · 拖到此处移回根目录" }}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent class="w-44"
        ><ContextMenuGroup>
          <ContextMenuItem @select="action('file', '')"><FilePlus2 />新建文件</ContextMenuItem>
          <ContextMenuItem @select="action('folder', '')"><FolderPlus />新建文件夹</ContextMenuItem>
          <ContextMenuItem :disabled="!cutPath" @select="action('paste', '')"
            ><ClipboardPaste />粘贴到根目录</ContextMenuItem
          >
        </ContextMenuGroup></ContextMenuContent
      >
    </ContextMenu>
    <p v-if="error" role="alert" class="tree-error">{{ error }}</p>
    <p v-else-if="draft" class="explorer-hint">Enter 确认，Esc 取消</p>
    <p v-else-if="cutPath" class="explorer-hint">已剪切 {{ cutPath }}，选择目标文件夹后粘贴</p>
  </div>
</template>

<style scoped>
.explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.explorer-heading {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  height: 40px;
  padding: 0 10px 0 14px;
  font-size: 12px;
  color: var(--muted-foreground);
}
.explorer-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-block: 4px;
}
.tree-row {
  justify-content: flex-start;
  gap: 6px;
  width: 100%;
  height: 29px;
  padding-right: 12px;
  border-radius: 0;
  font-size: 12px;
  font-weight: 400;
  color: var(--foreground);
}
.tree-row.active {
  background: var(--accent);
}
.tree-row.cut {
  opacity: 0.45;
}
.tree-row.drop-target,
.root-target.active {
  background: var(--accent);
  outline: 1px dashed var(--primary);
  outline-offset: -1px;
}
.folder-icon {
  color: var(--file-folder);
}
.markdown-icon {
  color: var(--file-markdown);
}
.code-icon {
  color: var(--file-code);
}
.tree-edit {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 31px;
  padding-right: 4px;
}
.tree-edit :deep(input) {
  height: 27px;
  min-width: 0;
  border-radius: 4px;
  font-size: 12px;
  padding-inline: 6px;
}
.tree-edit > svg {
  flex-shrink: 0;
}
.tree-error {
  padding: 8px 12px;
  color: var(--destructive);
  font-size: 12px;
  line-height: 20px;
}
.explorer-hint {
  padding: 8px 12px;
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 18px;
}
.root-target {
  min-height: 64px;
  margin: 8px;
  padding: 12px 6px;
  font-size: 10px;
  line-height: 18px;
  color: var(--muted-foreground);
}
</style>
