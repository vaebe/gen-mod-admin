<script setup lang="ts">
import { useRoute } from "vue-router";
import { Gamepad2, Boxes, LogOut, UserRound } from "@lucide/vue";
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
        <img src="/gen-mod-icon.png" alt="" width="32" height="32" class="brand-icon" />
        <span class="font-semibold tracking-tight"
          >GenMod <span class="font-normal text-muted-foreground">Admin</span></span
        >
      </RouterLink>
      <nav v-if="user.role === 'admin'" class="admin-nav" aria-label="管理导航">
        <RouterLink to="/games" :class="{ selected: route.path.startsWith('/games') }"
          ><Gamepad2 :size="18" />游戏管理</RouterLink
        >
        <RouterLink to="/skills" :class="{ selected: route.path.startsWith('/skills') }"
          ><Boxes :size="18" />Skill 管理</RouterLink
        >
      </nav>
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
      <main class="main-content"><slot /></main>
    </div>
  </div>
  <main v-else class="auth-shell"><slot /></main>
</template>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
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
  background: var(--sidebar);
}
.brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 18px 32px;
  text-decoration: none;
  font-size: 16px;
}
.brand-icon {
  flex-shrink: 0;
  height: 32px;
  width: 32px;
  object-fit: contain;
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
.sidebar-account {
  margin-top: auto;
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
.main-content {
  max-width: 1760px;
  margin: 0 auto;
  padding: 24px;
}
.auth-shell {
  min-height: 100dvh;
}
</style>
