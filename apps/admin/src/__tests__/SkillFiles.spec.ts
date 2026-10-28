import { describe, expect, it } from "vite-plus/test";
import { strToU8 } from "fflate";
import {
  addFile,
  buildFileTree,
  createInitialFiles,
  fileText,
  renameFile,
} from "@/utils/skill-files";
import { filterSkills } from "@/views/skill/composables/useSkillCatalog";
import type { CatalogSkill } from "@/types";

describe("Skill 文件工作区", () => {
  it("默认入口包含与发布身份一致的 frontmatter", () => {
    const text = fileText(createInitialFiles("my-skill", '含有 : 和 " 的说明')["SKILL.md"]!);
    expect(text).toContain('name: "my-skill"');
    expect(text).toContain('description: "含有 : 和 \\" 的说明"');
  });

  it("任意扩展名的 UTF-8 可编辑，二进制不解码", () => {
    expect(fileText(strToU8("中文\nprint('hello')"))).toBe("中文\nprint('hello')");
    expect(fileText(new Uint8Array([0, 255, 128]))).toBeNull();
    expect(fileText(new Uint8Array([255]))).toBeNull();
    expect(fileText(new Uint8Array())).toBe("");
  });

  it("目录优先、层级正确，重命名保留原始字节", () => {
    const binary = new Uint8Array([0, 255]);
    const files = {
      "SKILL.md": strToU8("keep"),
      "assets/icon.bin": binary,
      "scripts/build.ps1": strToU8("code"),
    };
    expect(buildFileTree(Object.keys(files)).map((node) => node.path)).toEqual([
      "assets",
      "scripts",
      "SKILL.md",
    ]);
    expect(buildFileTree(Object.keys(files))[0]?.children?.[0]?.path).toBe("assets/icon.bin");
    const next = renameFile(files, "assets/icon.bin", "assets/new.bin");
    expect(next["assets/new.bin"]).toBe(binary);
    expect(next["assets/icon.bin"]).toBeUndefined();
    expect(next["SKILL.md"]).toBe(files["SKILL.md"]);
  });

  it.each([
    "../out.txt",
    "/tmp/a",
    "a//b",
    "a/./b",
    "C:\\a",
    "scripts",
    "SKILL.MD",
    "scripts/tool.ps1/a",
  ])("拒绝越界或冲突路径 %s", (path) => {
    expect(() =>
      addFile({ "SKILL.md": strToU8("keep"), "scripts/tool.ps1": strToU8("code") }, path),
    ).toThrow();
  });

  it("拒绝重命名覆盖已有文件，原文件不丢失", () => {
    const files = { "a.txt": strToU8("a"), "b.txt": strToU8("b") };
    expect(() => renameFile(files, "a.txt", "b.txt")).toThrow();
    expect(Object.keys(files)).toEqual(["a.txt", "b.txt"]);
  });
});

it("Skill 列表同时按游戏和名称筛选，通用 Skill 独立显示", () => {
  const base = {
    description: "制作模组",
    versions: [],
    dependencies: [],
    excludePaths: [],
    requiredCommandScripts: [],
    inspectionFile: null,
  };
  const skills: CatalogSkill[] = [
    { ...base, id: "1", name: "workflow", kind: "common", gameId: null },
    { ...base, id: "2", name: "game-tools", kind: "game", gameId: "game-a" },
    { ...base, id: "3", name: "other", kind: "game", gameId: "game-b" },
  ];
  expect(filterSkills(skills, "game:game-a", "TOOLS").map((s) => s.id)).toEqual(["2"]);
  expect(filterSkills(skills, "common", "").map((s) => s.id)).toEqual(["1"]);
  expect(filterSkills(skills, "all", "制作")).toHaveLength(3);
});
