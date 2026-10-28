<script setup lang="ts">
import { useRoute } from "vue-router";
import { Gamepad2, Boxes, LogOut, ChevronRight, Layers, UserRound } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/types";

defineProps<{ user: AuthUser | null; busy: boolean }>();
const emit = defineEmits<{ logout: [] }>();
const route = useRoute();
</script>

<template>
  <div v-if="user" class="admin-shell">
    <aside class="admin-sidebar">
      <RouterLink to="/" class="brand-link">
        <span class="brand-icon"><Layers :size="21" /></span>
        <span class="font-semibold tracking-tight"
          >GenMod <span class="font-normal text-muted-foreground">Admin</span></span
        >
      </RouterLink>
      <div class="nav-section-label">内容管理</div>
      <nav v-if="user.role === 'admin'" class="admin-nav" aria-label="管理导航">
        <RouterLink to="/games" :class="{ selected: route.path.startsWith('/games') }"
          ><Gamepad2 :size="18" />游戏管理</RouterLink
        >
        <RouterLink to="/skills" :class="{ selected: route.path.startsWith('/skills') }"
          ><Boxes :size="18" />Skill 管理</RouterLink
        >
      </nav>
      <div class="sidebar-note">
        <span class="size-1.5 rounded-full bg-primary" />官方内容工作区
      </div>
      <div class="sidebar-account">
        <span class="account-avatar"><UserRound :size="17" /></span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium" :title="user.email">{{ user.email }}</p>
          <p class="mt-1 text-[11px] text-muted-foreground">
            {{ user.role === "admin" ? "管理员" : "普通用户" }}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          title="退出登录"
          aria-label="退出登录"
          :disabled="busy"
          @click="emit('logout')"
          ><LogOut :size="16"
        /></Button>
      </div>
    </aside>
    <div class="min-w-0">
      <header class="app-topbar">
        <span class="text-muted-foreground">内容管理</span
        ><ChevronRight :size="14" class="text-muted-foreground/60" /><span>{{
          route.meta.title || "工作区"
        }}</span
        ><span class="ml-auto text-xs text-muted-foreground">GenMod Console</span>
      </header>
      <main class="main-content"><slot /></main>
    </div>
  </div>
  <main v-else class="auth-shell"><slot /></main>
</template>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  min-width: 1200px;
  min-height: 100dvh;
}
.admin-sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--card);
}
.brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 20px 32px;
  text-decoration: none;
  font-size: 16px;
}
.brand-icon {
  display: grid;
  place-items: center;
  height: 32px;
  width: 32px;
  border-radius: 8px;
  background: var(--primary);
  color: white;
}
.nav-section-label {
  padding: 0 24px 12px;
  color: var(--muted-foreground);
  font-size: 11px;
}
.admin-nav {
  display: grid;
  gap: 5px;
  padding: 0 12px;
}
.admin-nav a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 6px;
  color: var(--muted-foreground);
  text-decoration: none;
  font-size: 13px;
  transition: background 150ms;
}
.admin-nav a:hover {
  background: var(--muted);
}
.admin-nav a.selected {
  color: var(--primary);
  background: var(--accent);
  font-weight: 600;
}
.sidebar-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: auto 24px 24px;
  color: var(--muted-foreground);
  font-size: 11px;
}
.sidebar-account {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 16px 12px;
  border-top: 1px solid var(--border);
}
.account-avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--muted);
  color: var(--muted-foreground);
}
.app-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 60px;
  padding: 0 32px;
  border-bottom: 1px solid var(--border);
  background: var(--card);
  font-size: 12px;
}
.main-content {
  max-width: 1760px;
  margin: 0 auto;
  padding: 32px;
}
.auth-shell {
  display: grid;
  min-height: 100dvh;
  align-items: center;
  padding: 24px;
}
</style>
