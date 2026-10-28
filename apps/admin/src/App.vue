<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { AuthUser } from './types'
import { user, loggedIn, logout } from './features/auth/session'
import { navigationError } from './router'
import { message } from './lib/api'
const router = useRouter()
async function authenticated(value: AuthUser) { loggedIn(value); navigationError.value = ''; await router.push(value.role === 'admin' ? '/games' : '/') }
async function signOut() { try { await logout(); await router.push('/login') } catch (cause) { navigationError.value = message(cause) } }
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar"><RouterLink to="/" class="brand">GEN<span>MOD</span><small>ADMIN CONSOLE</small></RouterLink>
      <nav v-if="user?.role === 'admin'" aria-label="管理导航"><RouterLink to="/games"><span class="mono">01</span> 游戏管理</RouterLink><RouterLink to="/skills"><span class="mono">02</span> 官方 Skill</RouterLink></nav>
      <div class="account"><template v-if="user"><small>{{ user.email }}</small><span class="badge">{{ user.role === 'admin' ? '管理员' : '普通用户' }}</span><button @click="signOut">退出登录</button></template><small v-else>官方内容管理平台</small></div>
    </aside>
    <main class="main-content"><p v-if="navigationError" role="alert" class="error">{{ navigationError }}</p><RouterView v-slot="{ Component }"><component :is="Component" @authenticated="authenticated" /></RouterView></main>
  </div>
</template>
