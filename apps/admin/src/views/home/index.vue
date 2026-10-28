<script setup lang="ts">
import { ShieldCheck, ArrowRight } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { user } from "@/stores/session";
</script>
<template>
  <section class="surface mx-auto max-w-xl p-8">
    <ShieldCheck :size="30" class="mb-5 text-primary" />
    <h1>账号已登录</h1>
    <p class="mt-3 text-muted-foreground">{{ user?.email }}</p>
    <p
      v-if="user?.role !== 'admin'"
      class="mt-5 rounded-md bg-muted p-4 text-sm text-muted-foreground"
    >
      当前账号没有管理权限。
    </p>
    <Button v-else as-child class="mt-6"
      ><RouterLink to="/games">进入游戏管理<ArrowRight :size="14" /></RouterLink
    ></Button>
  </section>
</template>
