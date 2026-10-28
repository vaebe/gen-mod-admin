<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useGames } from "./composables/useGames";

const GameForm = defineAsyncComponent(() => import("./components/GameForm.vue"));
const GameList = defineAsyncComponent(() => import("./components/GameList.vue"));
const { games, form, editing, busy, error, notice, clear, edit, save, remove, reload } = useGames();
</script>

<template>
  <header class="page-heading">
    <div>
      <p class="eyebrow">CATALOG / GAMES</p>
      <h1>游戏管理</h1>
      <p class="muted">先创建游戏，再绑定官方游戏 Skill。</p>
    </div>
    <span class="count mono">{{ games.length.toString().padStart(2, "0") }}</span>
  </header>
  <div v-if="error" role="alert" class="error actions">
    <span>{{ error }}</span>
    <button type="button" :disabled="busy" @click="reload">重新加载</button>
  </div>
  <p v-if="notice" role="status" class="notice">{{ notice }}</p>
  <div class="split-layout" :aria-busy="busy">
    <GameList :games="games" :busy="busy" @edit="edit" @remove="remove" />
    <GameForm v-model="form" :editing="editing" :busy="busy" @save="save" @cancel="clear" />
  </div>
</template>
