import { expect, it, vi } from "vite-plus/test";
import { strToU8 } from "fflate";
import { useSkillEditor } from "@/views/skill/composables/useSkillEditor";
import type { CatalogSkill } from "@/types";

const skill: CatalogSkill = {
  id: "s",
  name: "workflow",
  description: "说明",
  kind: "common",
  gameId: null,
  dependencies: [],
  excludePaths: [],
  requiredCommandScripts: [],
  inspectionFile: null,
  versions: [],
};

it("未发布的 Skill 默认有入口，单独保存清单不会误清除文件修改状态", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  try {
    const editor = useSkillEditor(() => skill, vi.fn());
    expect(editor.files.value["SKILL.md"]).toBeDefined();
    expect(editor.dirty.value).toBe(false);
    editor.files.value = { ...editor.files.value, "notes.custom": strToU8("arbitrary text") };
    editor.metadata.value.excludePaths = ["build"];
    expect(editor.dirty.value).toBe(true);
    await editor.saveMetadata();
    expect(editor.filesDirty.value).toBe(true);
    expect(editor.metadataDirty.value).toBe(false);
    expect(editor.dirty.value).toBe(true);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("发布失败保留修改和版本号，成功才建立新的干净基线", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('{"error":"版本号已存在"}', { status: 409 }))
    .mockResolvedValueOnce(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  try {
    const editor = useSkillEditor(() => skill, vi.fn());
    editor.files.value = { ...editor.files.value, "script.py": strToU8("print('ok')") };
    editor.version.value = "2.0";
    expect(await editor.publish(editor.version.value)).toBe(false);
    expect(editor.version.value).toBe("2.0");
    expect(editor.dirty.value).toBe(true);
    expect(await editor.publish(editor.version.value)).toBe(true);
    expect(editor.version.value).toBe("");
    expect(editor.dirty.value).toBe(false);
  } finally {
    vi.unstubAllGlobals();
  }
});
