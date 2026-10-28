<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAppSession } from "@/composables/useAppSession";
import { navigationError } from "@/router";

const AdminLayout = defineAsyncComponent(() => import("@/layouts/AdminLayout.vue"));
const { user, busy, error, authenticated, signOut } = useAppSession();
</script>

<template>
  <AdminLayout :user="user" :busy="busy" @logout="signOut">
    <p v-if="navigationError || error" role="alert" class="error">{{ navigationError || error }}</p>
    <RouterView v-slot="{ Component }">
      <component :is="Component" @authenticated="authenticated" />
    </RouterView>
  </AdminLayout>
</template>
