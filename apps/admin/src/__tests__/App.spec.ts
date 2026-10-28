import { afterEach, expect, it } from "vite-plus/test";
import { mount, flushPromises, enableAutoUnmount } from "@vue/test-utils";
import { vi } from "vite-plus/test";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "../App.vue";
import { loggedIn, user } from "../stores/session";
import appRouter from "../router";
import { request } from "../api/base";

enableAutoUnmount(afterEach);
afterEach(() => {
  user.value = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("shows management navigation only for administrators", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: { template: "<div>home</div>" } }],
  });
  await router.push("/");
  await router.isReady();
  user.value = { email: "a@b.c", role: "user" };
  const app = mount(App, { global: { plugins: [router] } });
  await vi.dynamicImportSettled();
  await flushPromises();
  expect(app.text()).not.toContain("游戏管理");
  user.value = { email: "admin@b.c", role: "admin" };
  await app.vm.$nextTick();
  expect(app.text()).toContain("游戏管理");
  expect(app.text()).toContain("Skill 管理");
});

it("returns to login only for an explicit 401, keeping session on service errors", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div>home</div>" } },
      { path: "/login", component: { template: "<div>login</div>" } },
      { path: "/:pathMatch(.*)*", component: { template: "<div>other</div>" } },
    ],
  });
  await router.push("/");
  user.value = { email: "admin@b.c", role: "admin" };
  mount(App, { global: { plugins: [router] } });
  await vi.dynamicImportSettled();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('{"error":"服务不可用"}', { status: 503 }))
    .mockResolvedValueOnce(new Response('{"error":"登录凭证无效"}', { status: 401 }));
  vi.stubGlobal("fetch", fetch);
  await expect(request.get("/skills")).rejects.toThrow("服务不可用");
  expect(user.value?.email).toBe("admin@b.c");
  expect(router.currentRoute.value.path).toBe("/");
  await expect(request.get("/skills")).rejects.toThrow("登录凭证无效");
  await flushPromises();
  expect(user.value).toBeNull();
  expect(router.currentRoute.value.path).toBe("/login");
});

it("does not invalidate the session when a page guard cancels logout navigation", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/skills/:id/edit", component: { template: "<p>editing</p>" } },
      { path: "/login", component: { template: "<p>login</p>" } },
      { path: "/:pathMatch(.*)*", component: { template: "<p>other</p>" } },
    ],
  });
  await router.push("/skills/s/edit");
  router.beforeEach((to) => (to.path === "/login" ? false : true));
  user.value = { email: "admin@b.c", role: "admin" };
  const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}'));
  vi.stubGlobal("fetch", fetch);
  const app = mount(App, { global: { plugins: [router] } });
  await vi.dynamicImportSettled();
  await flushPromises();
  await app.get('[aria-label="退出登录"]').trigger("click");
  await flushPromises();
  expect(fetch).not.toHaveBeenCalled();
  expect(user.value?.email).toBe("admin@b.c");
  expect(router.currentRoute.value.path).toBe("/skills/s/edit");
});

it("does not attach the login event listener to fragment route pages", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { template: "<h1>route page</h1><p>content</p>" } }],
  });
  await router.push("/");
  mount(App, { global: { plugins: [router] } });
  await vi.dynamicImportSettled();
  await flushPromises();
  expect(
    warn.mock.calls.some((args) =>
      args.some((value) => String(value).includes("Extraneous non-emits event listeners")),
    ),
  ).toBe(false);
});

it("keeps the document title when unsaved changes cancel navigation", async () => {
  loggedIn({ email: "admin@b.c", role: "admin" });
  await appRouter.push("/skills");
  const removeGuard = appRouter.beforeEach((to) => (to.path === "/games" ? false : true));
  try {
    await appRouter.push("/games");
    expect(document.title).toBe("Skill 管理 · GenMod");
  } finally {
    removeGuard();
  }
});
