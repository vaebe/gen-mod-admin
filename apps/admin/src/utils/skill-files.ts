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

export function parentPath(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

export function isFolder(files: PackageFiles, path: string): boolean {
  return Object.keys(files).some((entry) => entry.startsWith(`${path}/`));
}

function validateEntryPath(input: string): string {
  const path = input.trim();
  if (
    !path ||
    /[:\\]/.test(path) ||
    path
      .split("/")
      .some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          /[ .]$|[<>"|?*]/.test(part) ||
          Array.from(part).some(
            (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
          ) ||
          /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(?:\.|$)/i.test(part),
      )
  ) {
    throw new Error("名称包含无效字符，请使用有效的 Windows 文件名");
  }
  return path;
}

export function createEntry(files: PackageFiles, input: string, folder: boolean): PackageFiles {
  const path = validateEntryPath(input);
  const lower = path.toLowerCase();
  if (
    Object.keys(files).some((entry) => {
      const key = entry.replace(/\/$/, "").toLowerCase();
      return (
        key === lower ||
        key.startsWith(`${lower}/`) ||
        (!entry.endsWith("/") && lower.startsWith(`${key}/`))
      );
    })
  ) {
    throw new Error("同名文件或文件夹已存在，请使用其他名称");
  }
  return { ...files, [folder ? `${path}/` : path]: new Uint8Array() };
}

export function relocateEntry(files: PackageFiles, source: string, input: string): PackageFiles {
  const target = validateEntryPath(input);
  if (source === target) {
    return files;
  }
  const folder = isFolder(files, source);
  if (!folder && !Object.prototype.hasOwnProperty.call(files, source)) {
    throw new Error("文件或文件夹已不存在");
  }
  if (folder && target.toLowerCase().startsWith(`${source.toLowerCase()}/`)) {
    throw new Error("不能将文件夹移动到它自己的子目录中");
  }
  const moving = Object.keys(files).filter(
    (path) => path === source || path.startsWith(`${source}/`),
  );
  const remaining = Object.fromEntries(
    Object.entries(files).filter(([path]) => !moving.includes(path)),
  );
  // 先校验整个目标，全部成立后才替换，避免目录操作只移动一半。
  createEntry(remaining, target, folder);
  const next = { ...remaining };
  for (const path of moving) {
    next[target + path.slice(source.length)] = files[path]!;
  }
  const parent = parentPath(source);
  if (parent && !isFolder(next, parent)) {
    // 保留空父目录时也校验路径，防止移动后的文件占用它或它的祖先目录。
    return createEntry(next, parent, true);
  }
  return next;
}

export function addFile(files: PackageFiles, input: string): PackageFiles {
  return createEntry(files, input, false);
}

export function renameFile(files: PackageFiles, source: string, input: string): PackageFiles {
  const bytes = files[source];
  if (!bytes) {
    throw new Error("文件不存在");
  }
  return relocateEntry(files, source, input);
}

export function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = [];
  for (const path of paths) {
    let level = root;
    const directory = path.endsWith("/");
    const parts = path.replace(/\/$/, "").split("/");
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index]!;
      const current = parts.slice(0, index + 1).join("/");
      let node = level.find((item) => item.path === current);
      if (!node) {
        node = {
          name: part,
          path: current,
          ...(index < parts.length - 1 || directory ? { children: [] } : {}),
        };
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
