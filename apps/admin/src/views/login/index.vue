<script setup lang="ts">
import { reactive, ref } from "vue";
import type { AuthUser } from "@/types";
import { login, register } from "@/api/auth";
import { useRequestState } from "@/composables/useRequestState";

const emit = defineEmits<{ authenticated: [user: AuthUser] }>();
const form = reactive({ email: "", password: "" });
const registering = ref(false);
const { busy, error, run } = useRequestState();

function submit(): Promise<boolean> {
  return run(async () => {
    if (registering.value) {
      await register(form);
    }
    emit("authenticated", await login(form));
  });
}
</script>

<template>
  <section class="login-panel panel">
    <p class="eyebrow">GENMOD / CONSOLE</p>
    <h1>{{ registering ? "创建账号" : "登录管理端" }}</h1>
    <p class="muted">游戏与官方 Skill 的发布空间</p>
    <form class="stack" @submit.prevent="submit">
      <fieldset class="stack" :disabled="busy">
        <label
          >邮箱<input v-model.trim="form.email" type="email" autocomplete="email" required
        /></label>
        <label>
          密码
          <input
            v-model="form.password"
            type="password"
            :autocomplete="registering ? 'new-password' : 'current-password'"
            required
          />
        </label>
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <button class="primary">
          {{ busy ? "正在提交…" : registering ? "注册并登录" : "登录" }}
        </button>
      </fieldset>
    </form>
    <button type="button" class="text-button" :disabled="busy" @click="registering = !registering">
      {{ registering ? "已有账号，前往登录" : "没有账号，注册" }}
    </button>
  </section>
</template>
