import { computed, shallowRef, watch, type Ref } from "vue";
import {
  buildFileTree,
  createEntry,
  isFolder,
  parentPath,
  relocateEntry,
  type FileNode,
  type PackageFiles,
} from "@/utils/skill-files";

export type ExplorerAction = "file" | "folder" | "rename" | "cut" | "paste" | "remove";
export interface ExplorerDraft {
  source: string;
  parent: string;
  folder: boolean;
  name: string;
  rename: boolean;
}
export function useFileExplorer(
  files: Ref<PackageFiles>,
  moved: (source: string, target: string) => void,
) {
  const focused = shallowRef("SKILL.md");
  const collapsed = shallowRef<string[]>([]);
  const cutPath = shallowRef("");
  const draft = shallowRef<ExplorerDraft | null>(null);
  const error = shallowRef("");
  const dropTarget = shallowRef<string | null>(null);
  const tree = computed(() => buildFileTree(Object.keys(files.value)));
  const rows = computed(() => {
    const result: (FileNode & { depth: number; draft?: boolean })[] = [];
    const editing = draft.value;
    function placeholder(parent: string, depth: number): void {
      if (editing && !editing.rename && editing.parent === parent) {
        result.push({
          name: "",
          path: `${parent}/:draft`,
          depth,
          draft: true,
          ...(editing.folder ? { children: [] } : {}),
        });
      }
    }
    function walk(nodes: FileNode[], depth: number): void {
      for (const node of nodes) {
        result.push({ ...node, depth });
        if (node.children && !collapsed.value.includes(node.path)) {
          placeholder(node.path, depth + 1);
          walk(node.children, depth + 1);
        }
      }
    }
    placeholder("", 0);
    walk(tree.value, 0);
    return result;
  });
  function toggle(path: string): void {
    collapsed.value = collapsed.value.includes(path)
      ? collapsed.value.filter((item) => item !== path)
      : [...collapsed.value, path];
  }
  function destination(path: string): string {
    return path && isFolder(files.value, path) ? path : parentPath(path);
  }
  function begin(folder: boolean, source = "", context = focused.value): void {
    const parent = source ? parentPath(source) : destination(context);
    collapsed.value = collapsed.value.filter(
      (path) => parent !== path && !parent.startsWith(`${path}/`),
    );
    draft.value = {
      source,
      parent,
      folder,
      name: source.split("/").slice(-1)[0] || "",
      rename: Boolean(source),
    };
    error.value = "";
  }
  function cancel(): void {
    draft.value = null;
    error.value = "";
  }
  function move(source: string, targetFolder: string): void {
    if (source === targetFolder) {
      return;
    }
    const target = [targetFolder, source.split("/").slice(-1)[0]].filter(Boolean).join("/");
    try {
      const next = relocateEntry(files.value, source, target);
      moved(source, target);
      files.value = next;
      focused.value = target;
      collapsed.value = collapsed.value.filter((path) => path !== targetFolder);
      cutPath.value = "";
      error.value = "";
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "移动失败";
    }
  }
  function submit(): string | null {
    const editing = draft.value;
    if (!editing) {
      return null;
    }
    try {
      const name = editing.name.trim();
      if (!name || name.includes("/") || name.includes("\\")) {
        throw new Error("请输入名称，不要包含路径分隔符");
      }
      const target = [editing.parent, name].filter(Boolean).join("/");
      const next = editing.rename
        ? relocateEntry(files.value, editing.source, target)
        : createEntry(files.value, target, editing.folder);
      if (editing.rename) {
        moved(editing.source, target);
      }
      files.value = next;
      focused.value = target;
      cancel();
      return editing.folder ? null : target;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "文件操作失败";
      return null;
    }
  }
  watch(files, (next, previous) => {
    // 加载另一版本或导入时，清理悬空的剪切目标与编辑状态。
    if (
      cutPath.value &&
      !isFolder(next, cutPath.value) &&
      !Object.prototype.hasOwnProperty.call(next, cutPath.value)
    ) {
      cutPath.value = "";
    }
    if (
      draft.value?.source &&
      !Object.keys(next).some(
        (path) => path === draft.value?.source || path.startsWith(`${draft.value?.source}/`),
      )
    ) {
      cancel();
    }
    if (
      next !== previous &&
      !Object.keys(next).some(
        (path) => path === focused.value || path.startsWith(`${focused.value}/`),
      )
    ) {
      focused.value = "";
    }
  });
  return {
    focused,
    collapsed,
    cutPath,
    draft,
    error,
    dropTarget,
    rows,
    toggle,
    destination,
    begin,
    cancel,
    move,
    submit,
  };
}
