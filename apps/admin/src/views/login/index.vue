<script setup lang="ts">
import { reactive, shallowRef } from "vue";
import { ArrowRight } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@/types";
import { login, register } from "@/api/auth";
import { useRequestState } from "@/composables/useRequestState";
const emit = defineEmits<{ authenticated: [user: AuthUser] }>();
const form = reactive({ email: "", password: "" });
const registering = shallowRef(false);
const { busy, error, run } = useRequestState();
function submit(): Promise<boolean> {
  return run(async () => {
    if (registering.value) {
      await register(form);
    }
    emit("authenticated", await login(form));
  });
}
function toggleMode(): void {
  registering.value = !registering.value;
  error.value = "";
}
</script>
<template>
  <section class="mx-auto w-full max-w-sm">
    <div class="mb-10 flex items-center justify-center gap-2.5">
      <img src="/gen-mod-icon.png" alt="" width="36" height="36" class="size-9 object-contain" />
      <span class="text-xl font-semibold tracking-tight"
        >GenMod <span class="font-normal text-muted-foreground">Admin</span></span
      >
    </div>
    <div class="surface p-7">
      <h1 class="text-xl">{{ registering ? "创建账号" : "登录管理端" }}</h1>
      <p class="page-description">管理游戏与官方 Skill 的内容和版本。</p>
      <form class="mt-7" @submit.prevent="submit">
        <fieldset class="grid gap-5" :disabled="busy">
          <label class="field"
            >邮箱<Input
              v-model.trim="form.email"
              type="email"
              autocomplete="email"
              placeholder="name@example.com"
              required /></label
          ><label class="field"
            >密码<Input
              v-model="form.password"
              type="password"
              :autocomplete="registering ? 'new-password' : 'current-password'"
              placeholder="输入密码"
              required
          /></label>
          <p v-if="error" role="alert" class="error">{{ error }}</p>
          <Button type="submit" class="w-full"
            >{{ busy ? "正在提交…" : registering ? "注册并登录" : "登录" }}<ArrowRight :size="15"
          /></Button>
        </fieldset>
      </form>
      <Button
        data-toggle-login
        variant="link"
        class="mt-4 w-full text-xs text-muted-foreground"
        :disabled="busy"
        @click="toggleMode"
        >{{ registering ? "已有账号，前往登录" : "没有账号，注册" }}</Button
      >
    </div>
    <p class="mt-6 text-center text-xs text-muted-foreground">GenMod 官方内容管理平台</p>
  </section>
</template>
