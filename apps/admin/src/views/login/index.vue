<script setup lang="ts">
import { defineAsyncComponent, reactive, shallowRef } from "vue";
import { ArrowRight, LoaderCircle } from "@lucide/vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@/types";
import { login, register } from "@/api/auth";
import { useRequestState } from "@/composables/useRequestState";
const emit = defineEmits<{ authenticated: [user: AuthUser] }>();
const AuthScene = defineAsyncComponent(() => import("./components/AuthScene.vue"));
const form = reactive({ email: "", password: "", confirmPassword: "" });
const registering = shallowRef(false);
const { busy, error, run } = useRequestState();
function submit(): Promise<boolean> {
  return run(async () => {
    if (registering.value && form.password !== form.confirmPassword) {
      throw new Error("两次输入的密码不一致");
    }
    const credentials = { email: form.email.trim(), password: form.password };
    if (registering.value) {
      await register(credentials);
    }
    emit("authenticated", await login(credentials));
  });
}
function toggleMode(): void {
  registering.value = !registering.value;
  form.confirmPassword = "";
  error.value = "";
}
</script>
<template>
  <section class="auth-page" aria-labelledby="auth-title">
    <div class="auth-content">
      <AuthScene />
      <div class="auth-form-area">
        <div class="surface auth-form">
          <header class="auth-form-heading">
            <h1 id="auth-title">{{ registering ? "创建账号" : "登录管理端" }}</h1>
            <p class="page-description">
              {{
                registering
                  ? "注册后自动登录 GenMod 内容服务。"
                  : "欢迎回来，继续管理游戏与官方 Skill。"
              }}
            </p>
          </header>
          <form @submit.prevent="submit">
            <fieldset class="grid gap-5" :disabled="busy">
              <label class="field" for="admin-email">
                邮箱
                <Input
                  id="admin-email"
                  v-model.trim="form.email"
                  class="h-10"
                  type="email"
                  autocomplete="email"
                  placeholder="name@example.com"
                  required
                />
              </label>
              <label class="field" for="admin-password">
                密码
                <Input
                  id="admin-password"
                  v-model="form.password"
                  class="h-10"
                  type="password"
                  :autocomplete="registering ? 'new-password' : 'current-password'"
                  placeholder="输入密码"
                  required
                />
              </label>
              <label v-if="registering" class="field" for="admin-confirm-password">
                确认密码
                <Input
                  id="admin-confirm-password"
                  v-model="form.confirmPassword"
                  class="h-10"
                  type="password"
                  autocomplete="new-password"
                  placeholder="再次输入密码"
                  required
                />
              </label>
              <Alert v-if="error" variant="destructive">
                <AlertDescription>{{ error }}</AlertDescription>
              </Alert>
              <Button type="submit" size="lg" class="mt-1 w-full">
                <LoaderCircle v-if="busy" class="animate-spin" aria-hidden="true" />
                {{
                  busy
                    ? registering
                      ? "正在注册…"
                      : "正在登录…"
                    : registering
                      ? "注册并登录"
                      : "登录"
                }}
                <ArrowRight v-if="!busy" data-icon="inline-end" aria-hidden="true" />
              </Button>
            </fieldset>
          </form>
          <Button
            data-toggle-login
            variant="ghost"
            class="mt-3 w-full"
            :disabled="busy"
            @click="toggleMode"
          >
            {{ registering ? "已有账号，前往登录" : "没有账号，注册" }}
          </Button>
        </div>
        <p class="auth-form-note">GenMod 官方内容管理平台</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-page {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background: linear-gradient(115deg, oklch(0.97 0.012 166), var(--background) 66%);
}
.auth-page::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: linear-gradient(180deg, oklch(0.72 0.09 167), transparent 72%);
  content: "";
}
.auth-content {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  align-items: center;
  gap: clamp(48px, 7vw, 108px);
  width: 100%;
  max-width: 1190px;
  min-height: 100dvh;
  margin-inline: auto;
  padding: 56px clamp(32px, 5vw, 72px);
}
.auth-form-area {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.auth-form {
  width: 100%;
  max-width: 390px;
  padding: 32px;
  box-shadow: 0 20px 60px -30px oklch(0.3 0.02 166 / 0.2);
}
.auth-form-heading {
  margin-bottom: 28px;
}
.auth-form-note {
  color: var(--muted-foreground);
  font-size: 11px;
}
@media (max-width: 900px) {
  .auth-content {
    grid-template-columns: minmax(0, 1fr);
    align-content: center;
    gap: 30px;
    padding: 32px 24px;
  }
}
@media (max-width: 420px) {
  .auth-form {
    padding: 28px 24px;
  }
}
</style>
