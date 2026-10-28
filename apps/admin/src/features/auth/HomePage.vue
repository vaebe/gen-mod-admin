<script setup lang="ts">
import { user } from './session'
</script>
<template><section class="panel stack"><p class="eyebrow">GENMOD / ACCOUNT</p><h1>账号已登录</h1><p>{{ user?.email }}</p><p v-if="user?.role !== 'admin'" class="muted">当前账号没有管理权限。</p><RouterLink v-else to="/games">进入游戏管理 →</RouterLink></section></template>
