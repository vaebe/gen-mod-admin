import { afterEach, expect, it, vi } from "vite-plus/test";
import { flushPromises, mount, enableAutoUnmount } from "@vue/test-utils";
import LoginPage from "../views/login/index.vue";
import SkillForm from "../views/skill/components/SkillForm.vue";
import SkillVersions from "../views/skill/components/SkillVersions.vue";
import GamesPage from "../views/game/index.vue";
import SkillFiles from "../views/skill/components/SkillFiles.vue";
import SkillEditor from "../views/skill/components/SkillEditor.vue";
import { folderZip } from "../utils/skill-package";
import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";
import type { CatalogSkill, SkillVersionRecord } from "../types";
import { useSkillEditor } from "../views/skill/composables/useSkillEditor";
import { readBytes } from "../utils/skill-package";

enableAutoUnmount(afterEach);

afterEach(() => vi.unstubAllGlobals());
async function flushUI() {
  await vi.dynamicImportSettled();
  await flushPromises();
}
it("login sends Cookie credentials and emits the logged-in user", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ email: "a@b.c", role: "admin" })));
  vi.stubGlobal("fetch", fetch);
  const page = mount(LoginPage);
  await page.get("input[type=email]").setValue("a@b.c");
  await page.get("input[type=password]").setValue("password12");
  await page.get("form").trigger("submit");
  await flushPromises();
  expect(fetch).toHaveBeenCalledWith(
    "/api/auth/login",
    expect.objectContaining({
      credentials: "include",
      method: "POST",
      body: JSON.stringify({ email: "a@b.c", password: "password12" }),
    }),
  );
  expect(page.emitted("authenticated")?.[0]?.[0]).toMatchObject({ email: "a@b.c", role: "admin" });
});
it("allows common Skill without games and requires selection for game Skill", async () => {
  const form = mount(SkillForm, { props: { games: [] } });
  await form.get("[name=name]").setValue("workflow");
  await form.get("[name=description]").setValue("desc");
  await form.get("form").trigger("submit");
  expect(form.emitted("save")?.[0]?.[0]).toMatchObject({ kind: "common", gameId: null });
  await form.get("[name=kind]").setValue("game");
  await form.get("form").trigger("submit");
  expect(form.emitted("save")).toHaveLength(1);
  expect(form.text()).toContain("选择已有游戏");
});
it("five versions prevent upload and tell the administrator to remove old versions", () => {
  const versions = Array.from({ length: 5 }, (_, index) => ({
    id: String(index),
    version: String(index),
    fileId: String(index),
    uploadedAt: "2026-10-23T00:00:00Z",
    contentHash: "abc",
    skillId: "s",
    manifest: {
      category: "common" as const,
      gameId: null,
      version: String(index),
      dependencies: [],
      excludePaths: [],
      requiredCommandScripts: [],
      inspectionFile: null,
    },
  }));
  const page = mount(SkillVersions, { props: { versions } });
  expect(page.text()).toContain("先移除旧版本");
  expect(page.get("[data-publish]").attributes("disabled")).toBeDefined();
});

it("edits game names without changing identifiers and keeps the list on rejected deletion", async () => {
  const game = { id: "duckov", name: "Duckov", description: "desc" };
  const updated = { ...game, name: "新名称" };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify([game])))
    .mockResolvedValueOnce(new Response(JSON.stringify(updated)))
    .mockResolvedValueOnce(new Response(JSON.stringify([updated])))
    .mockResolvedValueOnce(
      new Response('{"error":"仍有 Skill 绑定，不能删除游戏"}', { status: 409 }),
    );
  vi.stubGlobal("fetch", fetch);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const page = mount(GamesPage);
  await flushUI();
  await page
    .findAll("button")
    .find((button) => button.text() === "编辑")!
    .trigger("click");
  expect(page.get("[name=id]").attributes("disabled")).toBeDefined();
  await page.get("[name=name]").setValue("新名称");
  await page.get("form").trigger("submit");
  await flushUI();
  expect(fetch).toHaveBeenCalledWith(
    "/api/games/duckov",
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ name: "新名称", description: "desc" }),
    }),
  );
  await page
    .findAll("button")
    .find((button) => button.text() === "删除")!
    .trigger("click");
  await flushUI();
  expect(page.text()).toContain("仍有 Skill 绑定");
  expect(page.text()).toContain("新名称");
  vi.restoreAllMocks();
});

it("restores version snapshot for file editing and republishes binary bytes without an extra metadata request", async () => {
  const version: SkillVersionRecord = {
    id: "v1",
    skillId: "s",
    version: "1",
    fileId: "file-1",
    uploadedAt: "2026-10-28T00:00:00Z",
    contentHash: "hash",
    manifest: {
      category: "common",
      gameId: null,
      version: "1",
      dependencies: ["dependency"],
      excludePaths: ["build"],
      requiredCommandScripts: [],
      inspectionFile: null,
    },
  };
  const skill: CatalogSkill = {
    id: "s",
    name: "workflow",
    kind: "common",
    gameId: null,
    description: "desc",
    dependencies: [],
    excludePaths: [],
    requiredCommandScripts: [],
    inspectionFile: null,
    versions: [version],
  };
  const bytes = zipSync({ "SKILL.md": strToU8("old"), "image.bin": new Uint8Array([0, 255]) });
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, blob: async () => new Blob([new Uint8Array(bytes).buffer]) })
    .mockResolvedValueOnce(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  const changed = vi.fn();
  const editor = useSkillEditor(() => skill, changed);
  await editor.edit(version);
  expect(editor.metadata.value.dependencies).toEqual(["dependency"]);
  editor.metadata.value.description = "edited";
  editor.files.value = { ...editor.files.value, "SKILL.md": strToU8("edited") };
  await editor.publish("2");
  expect(fetch).toHaveBeenCalledTimes(2);
  const form = fetch.mock.calls[1]![1].body as FormData;
  expect(form.get("dependencies")).toBe('["dependency"]');
  const published = unzipSync(await readBytes(form.get("zip") as File));
  expect(strFromU8(published["SKILL.md"]!)).toBe("edited");
  expect(published["image.bin"]).toEqual(new Uint8Array([0, 255]));
  expect(changed).toHaveBeenCalledOnce();
});
it("shows server authorization failures without reporting success", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "需要管理员权限" }), { status: 403 }),
      ),
  );
  const page = mount(LoginPage);
  await page.get("form").trigger("submit");
  await flushPromises();
  expect(page.text()).toContain("需要管理员权限");
  expect(page.emitted("authenticated")).toBeUndefined();
});
it("game form submits immutable identifier and refreshes the list", async () => {
  const saved = { id: "duckov", name: "Duckov", description: "desc" };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("[]"))
    .mockResolvedValueOnce(new Response(JSON.stringify(saved)))
    .mockResolvedValueOnce(new Response(JSON.stringify([saved])));
  vi.stubGlobal("fetch", fetch);
  const page = mount(GamesPage);
  await flushUI();
  await page.get("[name=id]").setValue("duckov");
  await page.get("[name=name]").setValue("Duckov");
  await page.get("[name=description]").setValue("desc");
  await page.get("form").trigger("submit");
  await flushUI();
  expect(fetch).toHaveBeenCalledWith(
    "/api/games",
    expect.objectContaining({ method: "POST", body: JSON.stringify(saved) }),
  );
  expect(page.text()).toContain("Duckov");
});
it("editing a text file retains the other binary files", async () => {
  const original = { "SKILL.md": strToU8("old"), "icon.bin": new Uint8Array([0, 255]) };
  const editor = mount(SkillFiles, { props: { modelValue: original } });
  await editor.get("textarea").setValue("new");
  const changed = editor.emitted("update:modelValue")![0]![0] as typeof original;
  expect(strFromU8(changed["SKILL.md"])).toBe("new");
  expect(changed["icon.bin"]).toEqual(new Uint8Array([0, 255]));
});
it("folder packaging strips selected root and keeps SKILL.md at zip root", async () => {
  const file = new File(["skill"], "SKILL.md");
  Object.defineProperty(file, "webkitRelativePath", { value: "my-folder/SKILL.md" });
  expect(Object.keys(unzipSync(await folderZip([file])))).toEqual(["SKILL.md"]);
});

it("publishes edited description in the same request as the version files", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  const page = mount(SkillEditor, {
    props: {
      skill: {
        id: "s",
        name: "workflow",
        description: "desc",
        kind: "common",
        gameId: null,
        dependencies: [],
        excludePaths: [],
        requiredCommandScripts: [],
        inspectionFile: null,
        versions: [],
      },
    },
  });
  await flushUI();
  await page.get("textarea").setValue("edited");
  await page.get('[aria-label="新增文件路径"]').setValue("SKILL.md");
  await page
    .findAll("button")
    .find((button) => button.text() === "新增文本文件")!
    .trigger("click");
  await page.get(".code-editor").setValue("---\nname: workflow\ndescription: edited\n---\nbody");
  const forms = page.findAll("form");
  await forms[forms.length - 1]!.get("input").setValue("2");
  await forms[forms.length - 1]!.trigger("submit");
  await flushUI();
  const request = fetch.mock.calls.find(([url]) => url === "/api/skills/s/versions");
  expect((request?.[1]?.body as FormData)?.get("description")).toBe("edited");
  expect((forms[forms.length - 1]!.get("input").element as HTMLInputElement).value).toBe("");
});

it("clears the previous request error when switching between login and registration", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response('{"error":"邮箱或密码不正确"}', { status: 401 })),
  );
  const page = mount(LoginPage);
  await page.get("form").trigger("submit");
  await flushUI();
  expect(page.text()).toContain("邮箱或密码不正确");
  await page.get(".text-button").trigger("click");
  expect(page.text()).toContain("创建账号");
  expect(page.text()).not.toContain("邮箱或密码不正确");
});

it("removes selected files from the package without touching other bytes", async () => {
  const editor = mount(SkillFiles, {
    props: { modelValue: { "SKILL.md": strToU8("keep"), "obsolete.txt": strToU8("remove") } },
  });
  await editor.get("select").setValue("obsolete.txt");
  const remove = editor.findAll("button").find((button) => button.text() === "删除文件");
  expect(remove, "file editor must offer deletion").toBeDefined();
  await remove!.trigger("click");
  expect(editor.emitted("update:modelValue")![0]![0]).toEqual({ "SKILL.md": strToU8("keep") });
});
