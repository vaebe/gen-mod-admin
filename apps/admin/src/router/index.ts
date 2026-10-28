import { shallowRef } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { loadUser } from "@/stores/session";
import { errorMessage } from "@/api/base";

export const navigationError = shallowRef("");

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: () => import("@/views/home/index.vue"),
      meta: { auth: true, title: "账号" },
    },
    { path: "/login", component: () => import("@/views/login/index.vue"), meta: { title: "登录" } },
    {
      path: "/games",
      component: () => import("@/views/game/index.vue"),
      meta: { auth: true, admin: true, title: "游戏管理" },
    },
    {
      path: "/skills",
      component: () => import("@/views/skill/index.vue"),
      meta: { auth: true, admin: true, title: "官方 Skill" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach(async (to) => {
  navigationError.value = "";
  if (!to.meta.auth) {
    return true;
  }
  try {
    const currentUser = await loadUser();
    if (!currentUser) {
      return "/login";
    }
    if (to.meta.admin && currentUser.role !== "admin") {
      return "/";
    }
    return true;
  } catch (cause) {
    navigationError.value = errorMessage(cause);
    return false;
  }
});

router.afterEach((to) => {
  document.title = `${to.meta.title ?? "管理端"} · GenMod`;
});

export default router;
