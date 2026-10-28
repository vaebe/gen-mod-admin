import { strToU8 } from "fflate";

export type PackageFiles = Record<string, Uint8Array>;
export interface FileNode {
  name: string;
  path: string;
  children?: FileNode[];
}

export function createInitialFiles(name: string, description: string): PackageFiles {
  return {
    "SKILL.md": strToU8(
      `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(description)}\n---\n\n# ${name}\n\n`,
    ),
  };
}

export function fileText(bytes: Uint8Array): string | null {
  if (bytes.includes(0)) {
    return null;
  }
  try {
    // 保留 BOM，编辑其他文件时不隐式改变原始内容。
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return null;
  }
}

function availablePath(files: PackageFiles, input: string): string {
  const path = input.trim();
  if (
    !path ||
    /[:\\]/.test(path) ||
    Array.from(path).some((character) => character.charCodeAt(0) < 32) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("请输入包内相对路径，例如 scripts/build.ps1；不能包含空目录或 ..");
  }
  const lower = path.toLowerCase();
  if (
    Object.keys(files).some((existing) => {
      const key = existing.toLowerCase();
      return key === lower || key.startsWith(`${lower}/`) || lower.startsWith(`${key}/`);
    })
  ) {
    throw new Error("路径已被文件或目录占用，不能覆盖已有内容");
  }
  return path;
}

export function addFile(files: PackageFiles, input: string): PackageFiles {
  return { ...files, [availablePath(files, input)]: new Uint8Array() };
}

export function renameFile(files: PackageFiles, source: string, input: string): PackageFiles {
  const bytes = files[source];
  if (!bytes) {
    throw new Error("文件不存在");
  }
  const next = { ...files };
  delete next[source];
  next[availablePath(next, input)] = bytes;
  return next;
}

export function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = [];
  for (const path of paths) {
    let level = root;
    const parts = path.split("/");
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index]!;
      const current = parts.slice(0, index + 1).join("/");
      let node = level.find((item) => item.path === current);
      if (!node) {
        node = { name: part, path: current, ...(index < parts.length - 1 ? { children: [] } : {}) };
        level.push(node);
      }
      if (node.children) {
        level = node.children;
      }
    }
  }
  function sort(nodes: FileNode[]): FileNode[] {
    nodes.sort(
      (a, b) =>
        Number(Boolean(b.children)) - Number(Boolean(a.children)) || a.name.localeCompare(b.name),
    );
    for (const node of nodes) {
      if (node.children) {
        sort(node.children);
      }
    }
    return nodes;
  }
  return sort(root);
}
