<script setup lang="ts">
import type { AuthUser } from "@/types";

defineProps<{ user: AuthUser | null; busy: boolean }>();
const emit = defineEmits<{ logout: [] }>();
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <RouterLink to="/" class="brand">
        GEN<span>MOD</span>
        <small>ADMIN CONSOLE</small>
      </RouterLink>
      <nav v-if="user?.role === 'admin'" aria-label="管理导航">
        <RouterLink to="/games"><span class="mono">01</span> 游戏管理</RouterLink>
        <RouterLink to="/skills"><span class="mono">02</span> 官方 Skill</RouterLink>
      </nav>
      <div class="account">
        <template v-if="user">
          <small>{{ user.email }}</small>
          <span class="badge">{{ user.role === "admin" ? "管理员" : "普通用户" }}</span>
          <button type="button" class="sign-out" :disabled="busy" @click="emit('logout')">
            退出登录
          </button>
        </template>
        <small v-else>官方内容管理平台</small>
      </div>
    </aside>
    <main class="main-content"><slot /></main>
  </div>
</template>

<style scoped>
.sign-out {
  color: var(--accent);
}
</style>
