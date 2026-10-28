import { afterEach, expect, it } from "vite-plus/test";
import { mount, flushPromises, enableAutoUnmount } from "@vue/test-utils";
import { vi } from "vite-plus/test";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "../App.vue";
import { user } from "../stores/session";
import { request } from "../api/base";

enableAutoUnmount(afterEach);
afterEach(() => {
  user.value = null;
  vi.unstubAllGlobals();
});
it("shows management navigation only for administrators", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { template: "<div>home</div>" } }],
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
  expect(app.text()).toContain("官方 Skill");
});

it("returns to login only for an explicit 401, keeping session on service errors", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div>home</div>" } },
      { path: "/login", component: { template: "<div>login</div>" } },
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
