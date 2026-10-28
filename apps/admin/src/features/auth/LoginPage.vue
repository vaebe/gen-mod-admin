<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import type { AuthUser } from '../../types'
import { api, message } from '../../lib/api'
const emit = defineEmits<{ authenticated: [user: AuthUser] }>()
const form = reactive({ email: '', password: '' })
const registering = shallowRef(false)
const busy = shallowRef(false)
const error = shallowRef('')
async function submit() {
  busy.value = true; error.value = ''
  try {
    if (registering.value) { await api('/auth/register', 'POST', form) }
    emit('authenticated', await api<AuthUser>('/auth/login', 'POST', form))
  } catch (cause) { error.value = message(cause) }
  finally { busy.value = false }
}
</script>
<template>
  <section class="login-panel panel">
    <p class="eyebrow">GENMOD / CONSOLE</p><h1>{{ registering ? '创建账号' : '登录管理端' }}</h1>
    <p class="muted">游戏与官方 Skill 的发布空间</p>
    <form class="stack" @submit.prevent="submit">
      <label>邮箱<input v-model="form.email" type="email" autocomplete="email" required /></label>
      <label>密码<input v-model="form.password" type="password" :autocomplete="registering ? 'new-password' : 'current-password'" required /></label>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <button class="primary" :disabled="busy">{{ busy ? '正在提交…' : registering ? '注册并登录' : '登录' }}</button>
    </form>
    <button class="text-button" @click="registering = !registering">{{ registering ? '已有账号，前往登录' : '没有账号，注册' }}</button>
  </section>
</template>
