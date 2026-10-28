import { afterEach, expect, it, vi } from "vite-plus/test";
import { DOMWrapper, flushPromises, mount, enableAutoUnmount } from "@vue/test-utils";
import { strToU8, strFromU8, unzipSync, zipSync } from "fflate";
import LoginPage from "../views/login/index.vue";
import GamesPage from "../views/game/index.vue";
import SkillFiles from "../views/skill/components/SkillFiles.vue";
import SkillEditor from "../views/skill/components/SkillEditor.vue";
import PublishVersionDialog from "../views/skill/components/PublishVersionDialog.vue";
import MarkdownPreview from "../views/skill/components/MarkdownPreview.vue";
import { folderZip, readBytes } from "../utils/skill-package";
import { useSkillEditor } from "../views/skill/composables/useSkillEditor";
import type { CatalogSkill, SkillVersionRecord } from "../types";
import { createMemoryHistory, createRouter } from "vue-router";
import EditorPage from "../views/skill/editor.vue";
import SkillCatalog from "../views/skill/components/SkillCatalog.vue";

// Monaco 的布局、worker 与真实输入在浏览器验收；组件测试只替换编辑器边界。
vi.mock("../views/skill/components/CodeEditor.vue", async () => {
  const { defineComponent } = await import("vue");
  return {
    __esModule: true,
    default: defineComponent({
      props: ["modelValue", "path", "readonly"],
      emits: ["update:modelValue"],
      template:
        '<textarea class="test-code-editor" :aria-label="`编辑 ${path}`" :value="modelValue" :disabled="readonly" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    }),
  };
});

enableAutoUnmount(afterEach);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function flushUI() {
  await vi.dynamicImportSettled();
  await flushPromises();
}
function dialog() {
  return new DOMWrapper(document.querySelector('[role="dialog"]')!);
}
function button(text: string) {
  return new DOMWrapper(
    Array.from(document.querySelectorAll("button")).find(
      (item) => item.textContent?.trim() === text,
    )!,
  );
}
const linkStub = { template: "<a><slot /></a>" };
const commonSkill: CatalogSkill = {
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
};
const firstVersion: SkillVersionRecord = {
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

it("login sends Cookie credentials and emits the logged-in user", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ email: "a@b.c", role: "admin" })));
  vi.stubGlobal("fetch", fetch);
  const page = mount(LoginPage);
  await page.get("input[type=email]").setValue("a@b.c");
  await page.get("input[type=password]").setValue("password12");
  await page.get("form").trigger("submit");
  await flushUI();
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
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(commonSkill)));
  vi.stubGlobal("fetch", fetch);
  const page = mount(SkillEditor, {
    props: { skill: { ...commonSkill, id: "", name: "", description: "" }, games: [] },
    global: { stubs: { RouterLink: linkStub } },
  });
  await flushUI();
  await page.get("[name=name]").setValue("workflow");
  await page.get("[name=description]").setValue("desc");
  expect((page.get(".test-code-editor").element as HTMLTextAreaElement).value).toContain(
    'description: "desc"',
  );
  await page.get("#skill-identity").trigger("submit");
  await flushUI();
  expect(page.emitted("created")?.[0]?.[0]).toMatchObject({ kind: "common", gameId: null });
  await page.get("[name=kind]").setValue("game");
  await page.get("#skill-identity").trigger("submit");
  await flushUI();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(page.text()).toContain("必须选择已有游戏");
});

it("five versions prevent publication and explain how to continue", async () => {
  const versions = Array.from({ length: 5 }, (_, index) => ({
    ...firstVersion,
    id: String(index),
    version: String(index),
  }));
  mount(PublishVersionDialog, {
    props: { versions, busy: false, error: "", open: true, version: "6" },
    attachTo: document.body,
  });
  await flushUI();
  expect(dialog().text()).toContain("先移除旧版本");
  expect(dialog().get("[data-publish]").attributes("disabled")).toBeDefined();
});

it("edits game names without changing identifiers and keeps list on rejected deletion", async () => {
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
  const page = mount(GamesPage, { attachTo: document.body });
  await flushUI();
  await button("编辑").trigger("click");
  await flushUI();
  expect(dialog().get("[name=id]").attributes("disabled")).toBeDefined();
  await dialog().get("[name=name]").setValue("新名称");
  await dialog().get("form").trigger("submit");
  await flushUI();
  expect(fetch).toHaveBeenCalledWith(
    "/api/games/duckov",
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ name: "新名称", description: "desc" }),
    }),
  );
  await page.get('[aria-label="删除 新名称"]').trigger("click");
  await flushUI();
  await button("删除游戏").trigger("click");
  await flushUI();
  expect(page.text()).toContain("仍有 Skill 绑定");
  expect(page.text()).toContain("新名称");
});

it("game form submits immutable identifier and refreshes list", async () => {
  const saved = { id: "duckov", name: "Duckov", description: "desc" };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("[]"))
    .mockResolvedValueOnce(new Response(JSON.stringify(saved)))
    .mockResolvedValueOnce(new Response(JSON.stringify([saved])));
  vi.stubGlobal("fetch", fetch);
  const page = mount(GamesPage, { attachTo: document.body });
  await flushUI();
  await button("新增游戏").trigger("click");
  await flushUI();
  await dialog().get("[name=id]").setValue("duckov");
  await dialog().get("[name=name]").setValue("Duckov");
  await dialog().get("[name=description]").setValue("desc");
  await dialog().get("form").trigger("submit");
  await flushUI();
  expect(fetch).toHaveBeenCalledWith(
    "/api/games",
    expect.objectContaining({ method: "POST", body: JSON.stringify(saved) }),
  );
  expect(page.text()).toContain("Duckov");
});

it("restores version snapshot and republishes binary bytes without an extra metadata request", async () => {
  const bytes = zipSync({ "SKILL.md": strToU8("old"), "image.bin": new Uint8Array([0, 255]) });
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, blob: async () => new Blob([new Uint8Array(bytes).buffer]) })
    .mockResolvedValueOnce(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  const changed = vi.fn();
  const editor = useSkillEditor(() => ({ ...commonSkill, versions: [firstVersion] }), changed);
  await editor.edit(firstVersion);
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
    vi.fn().mockResolvedValue(new Response('{"error":"需要管理员权限"}', { status: 403 })),
  );
  const page = mount(LoginPage);
  await page.get("form").trigger("submit");
  await flushUI();
  expect(page.text()).toContain("需要管理员权限");
  expect(page.emitted("authenticated")).toBeUndefined();
});

it("editing arbitrary text retains binary files and tree selection changes editor", async () => {
  const original = {
    "SKILL.md": strToU8("old"),
    "scripts/run.custom": strToU8("code"),
    "icon.bin": new Uint8Array([0, 255]),
  };
  const page = mount(SkillFiles, { props: { modelValue: original } });
  await flushUI();
  await page.get('[aria-label="scripts/run.custom"]').trigger("click");
  await flushUI();
  await page.get(".test-code-editor").setValue("new code");
  const changed = page.emitted("update:modelValue")![0]![0] as typeof original;
  expect(strFromU8(changed["scripts/run.custom"])).toBe("new code");
  expect(changed["icon.bin"]).toEqual(new Uint8Array([0, 255]));
  expect(strFromU8(changed["SKILL.md"])).toBe("old");
});

it("folder packaging strips selected root and keeps SKILL.md at zip root", async () => {
  const file = new File(["skill"], "SKILL.md");
  Object.defineProperty(file, "webkitRelativePath", { value: "my-folder/SKILL.md" });
  expect(Object.keys(unzipSync(await folderZip([file])))).toEqual(["SKILL.md"]);
});

it("publishes edited description and files in one request and clears version on success", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  const page = mount(SkillEditor, {
    props: { skill: commonSkill },
    global: { stubs: { RouterLink: linkStub } },
    attachTo: document.body,
  });
  await flushUI();
  await page.get("textarea:not(.test-code-editor)").setValue("edited");
  await page
    .get(".test-code-editor")
    .setValue("---\nname: workflow\ndescription: edited\n---\nbody");
  await button("发布新版本").trigger("click");
  await flushUI();
  await dialog().get("input").setValue("2");
  await dialog().get("form").trigger("submit");
  await flushUI();
  const request = fetch.mock.calls.find(([url]) => url === "/api/skills/s/versions");
  expect((request?.[1]?.body as FormData)?.get("description")).toBe("edited");
  expect(page.text()).toContain("新版本已发布");
  expect(document.querySelector("[role=dialog]")).toBeNull();
});

it("clears previous request error when switching login and registration", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response('{"error":"邮箱或密码不正确"}', { status: 401 })),
  );
  const page = mount(LoginPage);
  await page.get("form").trigger("submit");
  await flushUI();
  expect(page.text()).toContain("邮箱或密码不正确");
  await page.get("[data-toggle-login]").trigger("click");
  expect(page.text()).toContain("创建账号");
  expect(page.text()).not.toContain("邮箱或密码不正确");
});

it("deletes selected file only after confirmation without changing remaining bytes", async () => {
  const page = mount(SkillFiles, {
    props: { modelValue: { "SKILL.md": strToU8("keep"), "obsolete.txt": strToU8("remove") } },
    attachTo: document.body,
  });
  await flushUI();
  await page.get('[aria-label="obsolete.txt"]').trigger("click");
  await page.get('[aria-label="删除文件"]').trigger("click");
  await flushUI();
  expect(page.emitted("update:modelValue")).toBeUndefined();
  await button("删除文件").trigger("click");
  await flushUI();
  expect(page.emitted("update:modelValue")![0]![0]).toEqual({ "SKILL.md": strToU8("keep") });
});

it("Markdown preview removes scripts, event handlers and external media", () => {
  const page = mount(MarkdownPreview, {
    props: {
      text: '# Title\n<script>alert(1)</script><img src="https://example.com/x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a>',
    },
  });
  expect(page.find("h1").text()).toBe("Title");
  expect(page.find("script").exists()).toBe(false);
  expect(page.find("img").exists()).toBe(false);
  expect(page.find("a").attributes("href")).toBeUndefined();
});

it("new route keeps edited files after creation and confirms before leaving", async () => {
  const created = { ...commonSkill, id: "created-id", name: "new-skill" };
  const fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    if (url === "/api/games") {
      return new Response("[]");
    }
    if (options?.method === "POST") {
      return new Response(JSON.stringify(created));
    }
    return new Response("[]");
  });
  vi.stubGlobal("fetch", fetch);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/skills", component: { template: "<p>Skill list</p>" } },
      { path: "/skills/new", name: "skill-new", component: EditorPage },
      { path: "/skills/:id/edit", name: "skill-edit", component: EditorPage },
    ],
  });
  await router.push("/skills/new");
  const page = mount(
    { template: "<RouterView />" },
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushUI();
  await page.get("[name=name]").setValue("new-skill");
  await page.get("[name=description]").setValue("desc");
  await page.get(".test-code-editor").setValue("edited before creation");
  await page.get("#skill-identity").trigger("submit");
  await flushUI();
  expect(router.currentRoute.value.path).toBe("/skills/created-id/edit");
  expect((page.get(".test-code-editor").element as HTMLTextAreaElement).value).toBe(
    "edited before creation",
  );
  await page.get('a[href="/skills"]').trigger("click");
  await flushUI();
  expect(dialog().text()).toContain("未发布");
  await button("取消").trigger("click");
  await flushUI();
  expect(router.currentRoute.value.path).toBe("/skills/created-id/edit");
  await page.get('a[href="/skills"]').trigger("click");
  await flushUI();
  await button("放弃修改并离开").trigger("click");
  await flushUI();
  expect(router.currentRoute.value.path).toBe("/skills");
});

it("list filters on a real game named common without confusing common Skills", async () => {
  const page = mount(SkillCatalog, {
    props: {
      busy: false,
      games: [{ id: "common", name: "Common Game", description: "" }],
      skills: [
        commonSkill,
        { ...commonSkill, id: "game", name: "bound", kind: "game", gameId: "common" },
      ],
    },
    global: { stubs: { RouterLink: linkStub } },
  });
  await page.get("select").setValue("game:common");
  expect(page.text()).toContain("bound");
  expect(page.text()).not.toContain("workflow");
  await page.get('[aria-label="搜索 Skill"]').setValue("missing");
  expect(page.text()).toContain("没有匹配的 Skill");
});
